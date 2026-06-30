import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ClipRangeSelectorProps = {
  durationSeconds: number;
  endSeconds: number;
  maxRangeSeconds?: number;
  onChange: (startSeconds: number, endSeconds: number) => void;
  onComplete?: (startSeconds: number, endSeconds: number) => void;
  startSeconds: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export default function ClipRangeSelector({
  durationSeconds,
  endSeconds,
  maxRangeSeconds = 30,
  onChange,
  onComplete,
  startSeconds,
}: ClipRangeSelectorProps) {
  const trackRef = useRef<View>(null);
  const pageXRef = useRef(0);
  const widthRef = useRef(1);
  const activeHandleRef = useRef<"start" | "end" | null>(null);
  const dragStartRef = useRef({ pageX: 0, seconds: 0 });
  const rangeRef = useRef({ startSeconds, endSeconds });
  rangeRef.current = { startSeconds, endSeconds };

  const safeDuration = Math.max(durationSeconds, 1);
  const startPercent = (startSeconds / safeDuration) * 100;
  const endPercent = (endSeconds / safeDuration) * 100;
  const markerCount = 6;

  function formatTime(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
  }

  function measure() {
    trackRef.current?.measureInWindow((pageX, _pageY, width) => {
      pageXRef.current = pageX;
      widthRef.current = Math.max(width, 1);
    });
  }

  function secondsFromEvent(event: GestureResponderEvent) {
    const movedPixels = event.nativeEvent.pageX - dragStartRef.current.pageX;
    return clamp(
      dragStartRef.current.seconds +
        (movedPixels / widthRef.current) * safeDuration,
      0,
      safeDuration,
    );
  }

  function updateStart(event: GestureResponderEvent) {
    const current = rangeRef.current;
    const nextStart = clamp(secondsFromEvent(event), 0, current.endSeconds - 1);
    const nextEnd =
      current.endSeconds - nextStart > maxRangeSeconds
        ? Math.min(safeDuration, nextStart + maxRangeSeconds)
        : current.endSeconds;
    rangeRef.current = { startSeconds: nextStart, endSeconds: nextEnd };
    onChange(nextStart, nextEnd);
  }

  function updateEnd(event: GestureResponderEvent) {
    const current = rangeRef.current;
    const nextEnd = clamp(secondsFromEvent(event), current.startSeconds + 1, safeDuration);
    const nextStart =
      nextEnd - current.startSeconds > maxRangeSeconds
        ? Math.max(0, nextEnd - maxRangeSeconds)
        : current.startSeconds;
    rangeRef.current = { startSeconds: nextStart, endSeconds: nextEnd };
    onChange(nextStart, nextEnd);
  }

  function createResponder(kind: "start" | "end") {
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        activeHandleRef.current = kind;
        dragStartRef.current = {
          pageX: event.nativeEvent.pageX,
          seconds:
            kind === "start"
              ? rangeRef.current.startSeconds
              : rangeRef.current.endSeconds,
        };
        void Haptics.selectionAsync().catch(() => null);
      },
      onPanResponderMove: (event) => {
        if (activeHandleRef.current !== kind) {
          return;
        }

        if (kind === "start") {
          updateStart(event);
        } else {
          updateEnd(event);
        }
      },
      onPanResponderRelease: () => {
        activeHandleRef.current = null;
        onComplete?.(
          rangeRef.current.startSeconds,
          rangeRef.current.endSeconds,
        );
      },
      onPanResponderTerminate: () => {
        activeHandleRef.current = null;
      },
      onStartShouldSetPanResponder: () => true,
    });
  }

  const startResponder = useRef(createResponder("start")).current;
  const endResponder = useRef(createResponder("end")).current;

  return (
    <View style={styles.root}>
      <View style={styles.labelsRow}>
        <View style={styles.timePill}>
          <Text style={styles.timePillLabel}>START</Text>
          <Text style={styles.timePillValue}>{formatTime(startSeconds)}</Text>
        </View>
        <View style={styles.timePill}>
          <Text style={styles.timePillLabel}>FIM</Text>
          <Text style={styles.timePillValue}>{formatTime(endSeconds)}</Text>
        </View>
      </View>
      <View
        ref={trackRef}
        onLayout={measure}
        style={styles.trackArea}
      >
        <View style={styles.track}>
          {Array.from({ length: markerCount + 1 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.marker,
                { left: `${(index / markerCount) * 100}%` },
              ]}
            />
          ))}
        </View>
        <View
          style={[
            styles.selection,
            {
              left: `${startPercent}%`,
              width: `${Math.max(endPercent - startPercent, 0)}%`,
            },
          ]}
        />
        <View
          {...startResponder.panHandlers}
          style={[styles.handleTouch, { left: `${startPercent}%` }]}
        >
          <View style={styles.handle}>
            <View style={styles.handleGrip} />
          </View>
        </View>
        <View
          {...endResponder.panHandlers}
          style={[styles.handleTouch, { left: `${endPercent}%` }]}
        >
          <View style={styles.handle}>
            <View style={styles.handleGrip} />
          </View>
        </View>
      </View>
      <View style={styles.axisLabels}>
        {Array.from({ length: markerCount + 1 }, (_, index) => (
          <Text key={index} style={styles.axisLabel}>
            {formatTime((safeDuration * index) / markerCount)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 4,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timePill: {
    minWidth: 76,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  timePillLabel: {
    color: "#888",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  timePillValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  trackArea: {
    height: 72,
    justifyContent: "center",
    marginHorizontal: 9,
  },
  track: {
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  marker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  selection: {
    position: "absolute",
    height: 32,
    top: 20,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  handleTouch: {
    position: "absolute",
    width: 30,
    height: 72,
    marginLeft: -15,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 16,
    height: 44,
    borderRadius: 7,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  handleGrip: {
    width: 2,
    height: 18,
    borderRadius: 99,
    backgroundColor: "#fff",
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -5,
  },
  axisLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "700",
  },
});
