import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./config";
import { db } from "./dataClient";
import { firestoreCollections, firestorePaths } from "./paths";
import type {
  ReleaseType,
  MusicSubmissionDocument,
  UserDocument,
} from "./schema";
import { uploadUriToStorage } from "./storageClient";

export type MusicReviewUserSummary = {
  id: string;
  displayName: string;
  email: string;
  followersCount: number;
  tracksCount: number;
  username: string;
  verified: boolean;
  verifiedBy: string;
};

export type SubmitMusicInput = {
  userId: string;
  mp3Uri: string;
  declaredTitle?: string;
  reviewBatchId?: string;
  reviewBatchTitle?: string;
  reviewBatchTrackCount?: number;
  reviewBatchIndex?: number;
  reviewBatchReleaseType?: ReleaseType;
  requestedPreReleaseEnabled?: boolean;
  requestedPreReleaseDelaySeconds?: number;
  originalFileName?: string;
  ownershipStatement?: string;
  contributorsText?: string;
  rightsNotes?: string;
};

export function getAutomaticReleaseType(trackCount: number): ReleaseType {
  if (trackCount >= 1 && trackCount <= 3) return "single";
  if (trackCount >= 4 && trackCount <= 6) return "ep";
  if (trackCount >= 7 && trackCount <= 12) return "album";

  throw new Error("A release must contain between 1 and 12 tracks.");
}

function ensureMp3(value: string, fileName?: string) {
  const cleanValue = value.trim().split("?")[0].toLowerCase();
  const cleanName = fileName?.trim().split("?")[0].toLowerCase() ?? "";

  if (!cleanValue.endsWith(".mp3") && !cleanName.endsWith(".mp3")) {
    throw new Error("Only MP3 files are accepted.");
  }
}

export async function submitMusicForReview(
  input: SubmitMusicInput,
  onProgress?: (progress: number) => void,
) {
  ensureMp3(input.mp3Uri, input.originalFileName);
  const trackCount = input.reviewBatchTrackCount ?? 1;
  const automaticReleaseType = getAutomaticReleaseType(trackCount);

  const submissionRef = await addDoc(
    collection(db, firestoreCollections.musicSubmissions),
    {
      userId: input.userId,
      originalFileName: input.originalFileName ?? "",
      audioUrl: "",
      audioPath: "",
      mimeType: "audio/mpeg",
      fileExtension: "mp3",
      declaredTitle: input.declaredTitle?.trim() ?? "",
      reviewBatchId: input.reviewBatchId ?? "",
      reviewBatchTitle: input.reviewBatchTitle?.trim() ?? "",
      reviewBatchTrackCount: trackCount,
      reviewBatchIndex: input.reviewBatchIndex ?? 0,
      reviewBatchReleaseType: automaticReleaseType,
      reviewBatchAllowed: false,
      requestedPreReleaseEnabled: input.requestedPreReleaseEnabled === true,
      requestedPreReleaseDelaySeconds: input.requestedPreReleaseDelaySeconds ?? 0,
      ownershipStatement:
        input.ownershipStatement?.trim() ||
        "MP3 submitted by the authenticated user for Sonnor rights review.",
      contributorsText: input.contributorsText?.trim() ?? "",
      rightsNotes: input.rightsNotes?.trim() ?? "",
      status: "uploaded",
      fingerprint: {
        provider: "pending",
        status: "queued",
      },
      rightsReview: {
        risk: "unknown",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  const upload = await uploadUriToStorage(
    { kind: "submissionAudio", submissionId: submissionRef.id },
    input.mp3Uri.trim(),
    onProgress,
  );

  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionRef.id)), {
    id: submissionRef.id,
    audioUrl: upload.downloadUrl,
    audioPath: upload.path,
    status: "fingerprint_queued",
    updatedAt: serverTimestamp(),
  });

  return submissionRef.id;
}

export async function getMyMusicSubmissions(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.musicSubmissions),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(30),
    ),
  );

  return snapshot.docs.map((submission) => ({
    ...(submission.data() as MusicSubmissionDocument),
    id: submission.id,
  }));
}

export async function getMusicSubmission(submissionId: string) {
  const snapshot = await getDoc(doc(db, firestorePaths.musicSubmission(submissionId)));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...(snapshot.data() as MusicSubmissionDocument),
    id: snapshot.id,
  };
}

export async function getApprovedMusicSubmissionBatch(
  userId: string,
  reviewBatchId: string,
) {
  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.musicSubmissions),
      where("userId", "==", userId),
      where("reviewBatchId", "==", reviewBatchId),
      where("status", "==", "approved"),
      limit(80),
    ),
  );

  return snapshot.docs
    .map((submission) => ({
      ...(submission.data() as MusicSubmissionDocument),
      id: submission.id,
    }))
    .filter((submission) => submission.reviewBatchAllowed === true);
}

export async function getApprovedMusicSubmissions(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.musicSubmissions),
      where("userId", "==", userId),
      where("status", "==", "approved"),
      limit(30),
    ),
  );

  return snapshot.docs
    .map((submission) => ({
      ...(submission.data() as MusicSubmissionDocument),
      id: submission.id,
    }))
    .filter((submission) => submission.reviewBatchAllowed === true);
}

export async function getPendingMusicSubmissions() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, firestoreCollections.musicSubmissions),
        orderBy("createdAt", "desc"),
        limit(80),
      ),
    );

    return snapshot.docs
      .map((submission) => ({
        ...(submission.data() as MusicSubmissionDocument),
        id: submission.id,
      }))
      .filter((submission) => {
        if (submission.status === "completed" || submission.status === "cancelled" || submission.status === "rejected") {
          return false;
        }

        if (submission.reviewBatchId && submission.reviewBatchAllowed === true) {
          return false;
        }

        return ["fingerprint_queued", "manual_review", "uploaded", "approved"].includes(submission.status);
      });
  } catch (error) {
    console.log("PENDING MUSIC SUBMISSIONS FALLBACK:", error);
    return [];
  }
}

export async function getMusicReviewUserSummaries(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const entries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const snapshot = await getDoc(doc(db, firestorePaths.user(userId)));
      const data = snapshot.exists()
        ? (snapshot.data() as Partial<UserDocument>)
        : {};

      return [
        userId,
        {
          id: userId,
          displayName: data.displayName || data.username || "Unnamed user",
          email: data.email || "",
          followersCount: data.followersCount || 0,
          tracksCount: data.tracksCount || 0,
          username: data.username || "",
          verified: data.verified === true,
          verifiedBy: data.verifiedBy || "",
        },
      ] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<string, MusicReviewUserSummary>;
}

export async function markSubmissionForManualReview(submissionId: string) {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    status: "manual_review",
    "fingerprint.provider": "manual",
    "fingerprint.status": "not_configured",
    updatedAt: serverTimestamp(),
  });
}

export async function rejectMusicSubmission(submissionId: string, note: string) {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    status: "rejected",
    "rightsReview.decision": "rejected",
    "rightsReview.note": note.trim(),
    "rightsReview.reviewedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function approveMusicSubmission(submissionId: string, note = "") {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    status: "approved",
    "rightsReview.decision": "approved",
    "rightsReview.note": note.trim(),
    "rightsReview.reviewedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectMusicSubmissionBatch(
  submissions: MusicSubmissionDocument[],
  note: string,
) {
  await Promise.all(
    submissions.map((submission) =>
      rejectMusicSubmission(submission.id, note),
    ),
  );
}

export async function allowMusicSubmissionBatch(
  submissions: MusicSubmissionDocument[],
) {
  await Promise.all(
    submissions.map((submission) =>
      updateDoc(doc(db, firestorePaths.musicSubmission(submission.id)), {
        reviewBatchAllowed: true,
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function requestMusicOwnershipContact(
  submissions: MusicSubmissionDocument[],
) {
  const sendOwnershipEmail = httpsCallable<
    { submissionIds: string[] },
    { email: string; success: boolean }
  >(functions, "sendMusicOwnershipContactEmail");

  return sendOwnershipEmail({
    submissionIds: submissions.map((submission) => submission.id),
  });
}

export async function markMusicOwnershipContactSeen(submissionId: string) {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    adminContactSeen: true,
    updatedAt: serverTimestamp(),
  });
}

export async function completeMusicSubmission(
  submissionId: string,
  trackId: string,
) {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    status: "completed",
    completedTrackId: trackId,
    updatedAt: serverTimestamp(),
  });
}

export async function cancelMusicSubmission(submissionId: string) {
  await updateDoc(doc(db, firestorePaths.musicSubmission(submissionId)), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function canSubmitMusic() {
  return auth.currentUser !== null;
}
