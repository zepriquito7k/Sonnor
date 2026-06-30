import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import {
  allowMusicSubmissionBatch,
  approveMusicSubmission,
  getMusicReviewUserSummaries,
  getPendingMusicSubmissions,
  rejectMusicSubmissionBatch,
  requestMusicOwnershipContact,
  type MusicReviewUserSummary,
} from "../../firebase/musicReviewClient";
import type { MusicSubmissionDocument } from "../../firebase/schema";

type ReviewGroup = {
  id: string;
  title: string;
  submissions: MusicSubmissionDocument[];
};

function getGroupId(submission: MusicSubmissionDocument) {
  return submission.reviewBatchId || submission.id;
}

function getGroupTitle(submission: MusicSubmissionDocument) {
  return (
    submission.reviewBatchTitle ||
    submission.declaredTitle ||
    submission.originalFileName ||
    "Music for review"
  );
}

function releaseLabel(trackCount: number) {
  const type = trackCount >= 7 ? "album" : trackCount >= 4 ? "ep" : "single";
  return type === "album" ? "Album" : type === "ep" ? "EP" : "Single";
}

export default function AdminMusicReviewsScreen() {
  const [submissions, setSubmissions] = useState<MusicSubmissionDocument[]>([]);
  const [reviewUsers, setReviewUsers] = useState<Record<string, MusicReviewUserSummary>>({});
  const [expandedId, setExpandedId] = useState("");
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadQueue() {
    setLoading(true);
    try {
      const nextSubmissions = await getPendingMusicSubmissions();
      const userSummaries = await getMusicReviewUserSummaries(
        nextSubmissions.map((submission) => submission.userId),
      );

      setSubmissions(nextSubmissions);
      setReviewUsers(userSummaries);
    } catch (error) {
      console.log("LOAD REVIEW QUEUE ERROR:", error);
      Alert.alert("Error", "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const groups = useMemo<ReviewGroup[]>(() => {
    const map = new Map<string, ReviewGroup>();

    submissions.forEach((submission) => {
      const id = getGroupId(submission);
      const current = map.get(id);

      if (current) {
        current.submissions.push(submission);
        return;
      }

      map.set(id, {
        id,
        title: getGroupTitle(submission),
        submissions: [submission],
      });
    });

    return Array.from(map.values()).map((group) => ({
      ...group,
      submissions: group.submissions.sort((left, right) => {
        if (typeof left.reviewBatchIndex === "number" && typeof right.reviewBatchIndex === "number") {
          return left.reviewBatchIndex - right.reviewBatchIndex;
        }
        return (left.declaredTitle || left.originalFileName || left.id).localeCompare(
          right.declaredTitle || right.originalFileName || right.id,
        );
      }),
    }));
  }, [submissions]);

  async function handleOpenAudio(audioUrl: string) {
    if (!audioUrl) {
      Alert.alert("MP3 unavailable", "The file has not finished loading yet.");
      return;
    }

    try {
      await Linking.openURL(audioUrl);
    } catch (error) {
      console.log("OPEN SUBMISSION AUDIO ERROR:", error);
      Alert.alert("Error", "Could not open the MP3.");
    }
  }

  async function handleApprove(submission: MusicSubmissionDocument) {
    try {
      setBusyId(submission.id);
      await approveMusicSubmission(submission.id, "MP3 approved by Sonnor review.");
      await loadQueue();
    } catch (error) {
      console.log("APPROVE MUSIC ERROR:", error);
      Alert.alert("Error", "Could not approve this song.");
    } finally {
      setBusyId("");
    }
  }

  async function handleRejectGroup(group: ReviewGroup) {
    const note = rejectNotes[group.id]?.trim();

    if (!note) {
      Alert.alert("Reason required", "Enter the reason to cancel this submission.");
      return;
    }

    Alert.alert(
      "Cancel batch",
      "If one song fails, the whole submission is rejected. Do you want to continue?",
      [
        { text: "Back", style: "cancel" },
        {
          text: "Reject all",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyId(group.id);
              await rejectMusicSubmissionBatch(group.submissions, note);
              await loadQueue();
            } catch (error) {
              console.log("REJECT MUSIC BATCH ERROR:", error);
              Alert.alert("Error", "Could not reject this submission.");
            } finally {
              setBusyId("");
            }
          },
        },
      ],
    );
  }

  async function handleAllowGroup(group: ReviewGroup) {
    const allApproved = group.submissions.every(
      (submission) => submission.status === "approved",
    );

    if (!allApproved) {
      Alert.alert("Still pending", "All songs must be verified first.");
      return;
    }

    try {
      setBusyId(group.id);
      await allowMusicSubmissionBatch(group.submissions);
      await loadQueue();
      Alert.alert("Allowed", "The user can continue this release.");
    } catch (error) {
      console.log("ALLOW MUSIC BATCH ERROR:", error);
      Alert.alert("Error", "Could not allow this submission.");
    } finally {
      setBusyId("");
    }
  }

  async function handleRequestOwnershipContact(group: ReviewGroup) {
    try {
      setBusyId(group.id);
      await requestMusicOwnershipContact(group.submissions);
      await loadQueue();
      Alert.alert("Email sent", "The ownership request was sent to the artist.");
    } catch (error) {
      console.log("REQUEST OWNERSHIP CONTACT ERROR:", error);
      Alert.alert("Error", "Could not send the email right now.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Sonnor review</Text>
            <Text style={styles.title}>Music</Text>
          </View>
          <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadQueue}>
            <Ionicons name="refresh-outline" size={19} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.countText}>
          {loading ? "Loading..." : `${groups.length} submission${groups.length === 1 ? "" : "s"}`}
        </Text>

        {groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>There are no pending songs.</Text>
          </View>
        ) : (
          groups.map((group) => {
            const expanded = expandedId === group.id;
            const firstSubmission = group.submissions[0];
            const submitter = firstSubmission?.userId
              ? reviewUsers[firstSubmission.userId]
              : null;
            const contacted = group.submissions.some((submission) => {
              const data = submission as unknown as Record<string, unknown>;
              return data.adminContactRequested === true || Boolean(data.adminContactEmailSentAt);
            });
            const approvedCount = group.submissions.filter(
              (submission) => submission.status === "approved",
            ).length;
            const allApproved = approvedCount === group.submissions.length;

            return (
              <View key={group.id} style={[styles.groupCard, contacted ? styles.groupCardContacted : null]}>
                <Pressable
                  style={pressableFeedback(styles.groupHeader)}
                  onPress={() => setExpandedId(expanded ? "" : group.id)}
                >
                  <View style={styles.groupIcon}>
                    <Ionicons name={allApproved ? "checkmark" : "musical-notes"} size={18} color="#fff" />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {group.title}
                    </Text>
                    <Text style={styles.groupMeta}>
                      {releaseLabel(group.submissions.length)} · {approvedCount}/{group.submissions.length} verified
                    </Text>
                  </View>
                  {contacted ? (
                    <View style={styles.contactedPill}>
                      <Ionicons name="mail-open-outline" size={12} color="#000" />
                      <Text style={styles.contactedText}>Email sent</Text>
                    </View>
                  ) : null}
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#888" />
                </Pressable>

                {expanded ? (
                  <View style={styles.trackList}>
                    {submitter ? (
                      <View style={styles.submitterCard}>
                        <View style={styles.submitterHeader}>
                          <Text style={styles.submitterEyebrow}>Submitted by</Text>
                          {submitter.verified ? (
                            <View style={styles.verifiedPill}>
                              <Ionicons name="checkmark" size={10} color="#fff" />
                              <Text style={styles.verifiedPillText}>
                                Verified
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.unverifiedPill}>
                              <Text style={styles.unverifiedPillText}>Not verified</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.submitterName} numberOfLines={1}>
                          {submitter.displayName}
                        </Text>
                        <Text style={styles.submitterMeta} numberOfLines={1}>
                          {submitter.username ? `@${submitter.username}` : "No username"} · {submitter.email || "No email"}
                        </Text>
                        <Text style={styles.submitterStats}>
                          {submitter.followersCount} followers · {submitter.tracksCount} published songs · UID {submitter.id}
                        </Text>
                      </View>
                    ) : null}
                    {group.submissions.map((submission, index) => (
                      <View key={submission.id} style={styles.trackRow}>
                        <Text style={styles.trackIndex}>{index + 1}</Text>
                        <View style={styles.trackInfo}>
                          <Text style={styles.trackTitle} numberOfLines={1}>
                            {submission.declaredTitle || submission.originalFileName || "Untitled"}
                          </Text>
                          <Text style={styles.trackStatus}>
                            {submission.status === "approved" ? "Verified" : "Pending verification"}
                          </Text>
                        </View>
                        <Pressable style={pressableFeedback(styles.iconButton)} onPress={() => handleOpenAudio(submission.audioUrl)}>
                          <Ionicons name="play-outline" size={18} color="#fff" />
                        </Pressable>
                        <Pressable
                          style={pressableFeedback([
                            styles.iconButton,
                            submission.status === "approved" ? styles.iconButtonDone : null,
                          ])}
                          onPress={() => handleApprove(submission)}
                          disabled={busyId === submission.id || submission.status === "approved"}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </Pressable>
                      </View>
                    ))}

                    <TextInput
                      style={styles.rejectInput}
                      placeholder="Reason if any song fails"
                      placeholderTextColor="#666"
                      value={rejectNotes[group.id] ?? ""}
                      onChangeText={(value) =>
                        setRejectNotes((current) => ({ ...current, [group.id]: value }))
                      }
                    />

                    <View style={styles.actionsRow}>
                      <Pressable
                        style={pressableFeedback(styles.contactButton)}
                        onPress={() => handleRequestOwnershipContact(group)}
                        disabled={busyId === group.id}
                      >
                        <Text style={styles.contactText}>
                          {busyId === group.id ? "Contacting..." : contacted ? "Resend" : "Contact"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={pressableFeedback(styles.rejectButton)}
                        onPress={() => handleRejectGroup(group)}
                        disabled={busyId === group.id}
                      >
                        <Text style={styles.rejectText}>Reject batch</Text>
                      </Pressable>
                      <Pressable
                        style={pressableFeedback([styles.allowButton, !allApproved ? styles.buttonDisabled : null])}
                        onPress={() => handleAllowGroup(group)}
                        disabled={!allApproved || busyId === group.id}
                      >
                        <Text style={styles.allowText}>Allow</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 62,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: "#888",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  countText: {
    color: "#777",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 14,
  },
  emptyCard: {
    minHeight: 78,
    borderRadius: 22,
    padding: 16,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
  },
  groupCard: {
    borderRadius: 24,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  groupCardContacted: {
    borderTopColor: "#20e68a",
    borderTopWidth: 4,
  },
  groupHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  groupMeta: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  contactedPill: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#20e68a",
  },
  contactedText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
  },
  trackList: {
    paddingTop: 8,
  },
  submitterCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  submitterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  submitterEyebrow: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  submitterName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  submitterMeta: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  submitterStats: {
    color: "#777",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 7,
  },
  verifiedPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2d7dff",
  },
  verifiedPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  unverifiedPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  unverifiedPillText: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "900",
  },
  trackRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  trackIndex: {
    width: 20,
    color: "#666",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "800",
  },
  trackStatus: {
    color: "#777",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  iconButtonDone: {
    backgroundColor: "#2d7dff",
  },
  rejectInput: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 14,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  contactButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  contactText: {
    width: "100%",
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  rejectButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.14)",
    borderWidth: 1,
    borderColor: "rgba(210,62,62,0.35)",
  },
  rejectText: {
    color: "#ff9c9c",
    fontSize: 13,
    fontWeight: "900",
  },
  allowButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  allowText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
