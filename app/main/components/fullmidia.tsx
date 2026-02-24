import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const ART_SIZE = width * 0.9;

export default function FullMidia() {
  const router = useRouter();
  const [value, setValue] = useState(0.6);
  const [expanded, setExpanded] = useState(true);

  const boxAnim = useRef(new Animated.Value(1)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const toggleView = () => {
    blurAnim.setValue(1);

    Animated.parallel([
      Animated.timing(boxAnim, {
        toValue: expanded ? 0 : 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(controlsAnim, {
        toValue: expanded ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    setExpanded(!expanded);
  };

  const panelTranslate = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const boxScale = boxAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  return (
    <Pressable
      style={styles.container}
      onPress={!expanded ? toggleView : undefined}
    >
      <Animated.View
        style={{
          position: "absolute",
          width,
          height,
          opacity: bgAnim,
        }}
      >
        <Video
          source={require("../../../assets/From KlickPin CF malcolm _ Malcolm Cool gifs Type.mp4")}
          style={{ width, height }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: blurAnim }]}
      >
        <BlurView tint="dark" intensity={45} style={{ flex: 1 }} />
      </Animated.View>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>User name</Text>
        <Ionicons name="chatbubble-outline" size={25} color="#fff" />
      </View>

      <Animated.View
        style={[
          styles.artworkWrapper,
          {
            opacity: boxAnim,
            transform: [{ scale: boxScale }],
          },
        ]}
      >
        <Pressable onPress={toggleView}>
          <Image
            source={{
              uri: "https://i.pinimg.com/736x/17/c5/01/17c5017285bc72806ff99176f8d1051b.jpg",
            }}
            style={styles.artwork}
          />
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateY: panelTranslate }] }}>
        <View style={styles.info}>
          <View>
            <Text style={styles.music}>Music name</Text>
            <Text style={styles.user}>user name</Text>
          </View>
          <View style={styles.icons}>
            <Ionicons name="musical-note-outline" size={32} color="#fff" />
            <Ionicons name="heart-outline" size={32} color="#fff" />
            <Ionicons name="reorder-four-outline" size={32} color="#fff" />
          </View>
        </View>

        <View style={styles.slider}>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={value}
            onValueChange={setValue}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#fff"
          />
          <View style={styles.timeWrapper}>
            <Text style={styles.time}>1:55</Text>
            <Text style={styles.time}>1:55</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.controls}>
            <Ionicons name="play-back" size={60} color="#fff" />
            <Ionicons name="play" size={60} color="#fff" />
            <Ionicons name="play-forward" size={60} color="#fff" />
          </View>
        )}
      </Animated.View>

      <View style={styles.bottomBar}>
        <View style={styles.homeIndicator} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#860251ff",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "400",
  },
  artworkWrapper: {
    alignItems: "center",
    marginBottom: 50,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 18,
    backgroundColor: "#000",
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    marginBottom: -5,
  },
  music: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  user: {
    color: "#aaa",
    fontSize: 15,
  },
  icons: {
    flexDirection: "row",
    gap: 16,
  },
  slider: {
    paddingHorizontal: 25,
    marginBottom: 40,
  },
  time: {
    color: "#fff",
    fontSize: 12,
    marginTop: -6,
    alignSelf: "flex-end",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 90,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#000000b6",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: "center",
    paddingTop: 6,
  },
  homeIndicator: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
    opacity: 0.9,
  },
  timeWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
});
