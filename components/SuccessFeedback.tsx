import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

type SuccessFeedbackOptions = {
  message?: string;
  onDone?: () => void;
};

type SuccessFeedbackContextValue = {
  hideFeedback: () => void;
  showLoading: () => void;
  showSuccess: (options?: SuccessFeedbackOptions) => void;
};

const SuccessFeedbackContext = createContext<SuccessFeedbackContextValue | null>(null);

export function SuccessFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"loading" | "success">("success");
  const onDoneRef = useRef<(() => void) | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideFeedback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    onDoneRef.current = undefined;
    setVisible(false);
  }, []);

  const showLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    onDoneRef.current = undefined;
    setMode("loading");
    setVisible(true);
  }, []);

  const showSuccess = useCallback((options?: SuccessFeedbackOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    onDoneRef.current = options?.onDone;
    setMode("success");
    setVisible(true);

    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      const nextOnDone = onDoneRef.current;
      onDoneRef.current = undefined;
      nextOnDone?.();
    }, 1150);
  }, []);

  return (
    <SuccessFeedbackContext.Provider value={{ hideFeedback, showLoading, showSuccess }}>
      {children}
      <Modal animationType="fade" transparent visible={visible}>
        <View style={styles.backdrop}>
          {mode === "loading" ? (
            <ActivityIndicator color="#ffffff" size="large" />
          ) : (
            <Svg width={118} height={92} viewBox="0 0 118 92">
              <Path
                d="M12 49 L43 78 L106 14"
                fill="none"
                stroke="#00FF5A"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={13}
              />
            </Svg>
          )}
        </View>
      </Modal>
    </SuccessFeedbackContext.Provider>
  );
}

export function useSuccessFeedback() {
  const context = useContext(SuccessFeedbackContext);

  if (!context) {
    throw new Error("useSuccessFeedback must be used inside SuccessFeedbackProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.88)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 34,
  },
});
