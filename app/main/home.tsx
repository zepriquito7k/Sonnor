import { VideoView, useVideoPlayer } from "expo-video";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { InView } from "react-native-intersection-observer";
import DynamicIslandTest from "./components/Dynamicmenu";
import FullscreenMedia from "./components/FullscreenMedia";

export default function HomeScreen() {
  // FULLSCREEN STATES

  const [showFull, setShowFull] = useState(false);
  const [fullType, setFullType] = useState<"image" | "video" | null>(null);
  const [fullSource, setFullSource] = useState<string | null>(null);

  function openFullscreen(type: "image" | "video", uri: string) {
    setFullType(type);
    setFullSource(uri);
    setShowFull(true);
  }

  // PLAYER DO VÍDEO PARA TI
  const videoURL =
    "https://v1.pinimg.com/videos/mc/720p/91/4e/e0/914ee06848fac3b13ccd5dedd14050a9.mp4";
  const videoURL2 =
    "https://v1.pinimg.com/videos/mc/720p/31/60/fc/3160fc9d320f236c0d7c5e2d7ba46874.mp4";

  const player = useVideoPlayer(videoURL, (player) => {
    player.loop = true;
    player.muted = true; // MUDO FORA DO FULLSCREEN
    player.play();
  });

  const player2 = useVideoPlayer(videoURL2, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230 }}
      >
        {/* TÍTULO */}
        <Text style={styles.pageTitle}>Início</Text>
        {/* Banner */}
        <View style={styles.section}>
          <Image
            source={{
              uri: "https://i.pinimg.com/736x/29/e6/e3/29e6e31a8270d1c90cfcd4c80a83a22e.jpg",
            }}
            style={styles.bigBanner}
          />
        </View>

        {/* PARA TI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Para Ti</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {/* VÍDEO */}
              <Pressable onPress={() => openFullscreen("video", videoURL)}>
                <InView
                  onChange={(visible) => {
                    if (visible) player.play();
                    else player.pause();
                  }}
                >
                  <VideoView
                    pointerEvents="none"
                    style={{ width: 150, height: 200, borderRadius: 18 }}
                    player={player}
                    contentFit="cover"
                  />
                </InView>
              </Pressable>

              {/* IMAGENS */}
              {[
                "https://i.pinimg.com/1200x/ce/11/5d/ce115d51c75a6c5ddcbf16122dd0bb29.jpg",
                "https://i.pinimg.com/736x/30/29/16/3029169b150d79d2cec858a956d39158.jpg",
                "https://assets.vogue.com/photos/66fc142035ddd8ed70aeaa07/2:3/w_2320,h_3480,c_limit/VO1124_Cover_logo.jpg",
              ].map((uri, index) => (
                <Pressable
                  key={index}
                  onPress={() => openFullscreen("image", uri)}
                >
                  <Image style={styles.musicBox} source={{ uri }} />
                </Pressable>
              ))}

              <Pressable onPress={() => openFullscreen("video", videoURL2)}>
                <InView
                  onChange={(visible) => {
                    if (visible) player2.play();
                    else player2.pause();
                  }}
                >
                  <VideoView
                    pointerEvents="none"
                    style={{ width: 150, height: 200, borderRadius: 18 }}
                    player={player2}
                    contentFit="cover"
                  />
                </InView>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Continuar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continuar</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/30/66/90/306690d4-2a29-402e-e406-6b319ce7731a/886447227169.jpg/3000x3000bb.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Goosebumps </Text>
                <Text style={styles.itemArtist}>Travis Scott</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://akamai.sscdn.co/letras/360x360/albuns/8/8/4/1/01657916780.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Helmet</Text>
                <Text style={styles.itemArtist}>Steve Lacy</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://akamai.sscdn.co/uploadfile/letras/albuns/a/3/7/0/636221690206161.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Violent Crimes</Text>
                <Text style={styles.itemArtist}>Kanye West</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://t2.genius.com/unsafe/600x600/https%3A%2F%2Fimages.genius.com%2F93f59fb940730ecd0fd3ff88876daeab.1000x1000x1.png",
                  }}
                />
                <Text style={styles.itemTitle}>CP3</Text>
                <Text style={styles.itemArtist}>Headband Andy</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* LANÇAMENTOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lançamentos</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Swag_by_Justin_Bieber_%28no_PA_label%29.png",
                  }}
                />
                <Text style={styles.itemTitle}>SWAG</Text>
                <Text style={styles.itemArtist}>Justin Bieber</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/en/a/a4/Jack_Harlow_-_Jackman.png",
                  }}
                />
                <Text style={styles.itemTitle}>Jackman</Text>
                <Text style={styles.itemArtist}>Harlow Jack</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Lil_Tecca_-_Plan_A.png/250px-Lil_Tecca_-_Plan_A.png",
                  }}
                />
                <Text style={styles.itemTitle}>Plan A</Text>
                <Text style={styles.itemArtist}>Lil Tecca</Text>
              </View>

              {/*  novos boxes */}
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/30/66/90/306690d4-2a29-402e-e406-6b319ce7731a/886447227169.jpg/3000x3000bb.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Astroworld</Text>
                <Text style={styles.itemArtist}>Travis Scott</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/en/f/fd/Short_n%27_Sweet_-_Sabrina_Carpenter.png",
                  }}
                />
                <Text style={styles.itemTitle}>Short n' Sweet</Text>
                <Text style={styles.itemArtist}>Sabrina Carpenter</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
                  }}
                />
                <Text style={styles.itemTitle}>Blonde</Text>
                <Text style={styles.itemArtist}>Frank Ocean</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://akamai.sscdn.co/letras/360x360/albuns/5/6/f/a/01651790913.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Un Verano Sin Ti</Text>
                <Text style={styles.itemArtist}>Bad Bunny</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://akamai.sscdn.co/letras/360x360/albuns/7/5/9/b/2621201738316056.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Hurry Up Tomo...</Text>
                <Text style={styles.itemArtist}>The Weeknd</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/en/0/05/Drake_-_For_All_The_Dogs.png",
                  }}
                />
                <Text style={styles.itemTitle}>For All the Dogs</Text>
                <Text style={styles.itemArtist}>Drake</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Playboi_Carti_-_Music_album_cover.svg/500px-Playboi_Carti_-_Music_album_cover.svg.png",
                  }}
                />
                <Text style={styles.itemTitle}>Music</Text>
                <Text style={styles.itemArtist}>Playboi Carti</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        {/* MODA DOS ARTISTAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moda dos Artistas</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/b9874473-1198-4065-9481-11429df4c79e/cactus-jack.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Cactus Jack</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://i.pinimg.com/736x/68/e5/58/68e558a1bd02c7fe310a4d7c83a84fef.jpg",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>OVO®</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://i1.sndcdn.com/artworks-000091511144-t71ok2-t500x500.jpg",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>XO</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://libur.com.co/cdn/shop/collections/logoDrew.jpg?v=1669303182&width=1024",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Drew House</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://i.pinimg.com/736x/f7/fe/0c/f7fe0c63500a1614565a885a9aff6181.jpg",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Yeezy</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://m.media-amazon.com/images/I/212dNGWWxDL._UXNaN_FMjpg_QL85_.jpg",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Opium</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        {/* COLEÇÕES EXCLUSIVAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coleções Exclusivas</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.exclusiveRow}>
              <Image
                source={{
                  uri: "https://i.pinimg.com/1200x/1b/29/b0/1b29b024f371ce79de89071e3dbafa95.jpg",
                }}
                style={styles.exclusiveBox}
              />

              <Image
                source={{
                  uri: "https://xo.store/cdn/shop/files/1f.png?v=1764344896&width=600",
                }}
                style={styles.exclusiveBox}
              />

              <Image
                source={{
                  uri: "https://hypedfam.com/cdn/shop/products/air-jordan-1-low-travis-scott-black-phantom-1.png?v=1675689781&width=600",
                }}
                resizeMode="contain"
                style={{ width: 160, height: 160 }}
              />
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <DynamicIslandTest />

      {/* FULLSCREEN */}
      {showFull && fullSource && fullType && (
        <FullscreenMedia
          visible={showFull}
          onClose={() => {
            setShowFull(false);

            // REATIVAR MUTE PARA O VÍDEO NORMAL
            player.muted = true;
          }}
          type={fullType}
          source={fullSource}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0bff" },

  pageTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    paddingLeft: 20,
    marginTop: 50,
    marginBottom: 10,
  },

  section: { marginTop: 20 },

  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    paddingLeft: 20,
    marginBottom: 12,
  },

  bigBanner: {
    height: 180,
    borderRadius: 0,
    marginTop: -20,
  },

  horizontalList: {
    flexDirection: "row",
    gap: 14,
    paddingLeft: 20,
  },

  musicBox: {
    width: 150,
    height: 200,
    borderRadius: 18,
  },

  squareBox: {
    width: 150,
    height: 150,
    borderRadius: 18,
  },

  fashionCard: {
    width: 160,
  },

  fashionBox: {
    width: 160,
    height: 200,
    borderRadius: 18,
  },

  fashionLabel: {
    color: "#fff",
    marginTop: 6,
    fontSize: 15,
  },

  exclusiveRow: {
    flexDirection: "row",
    gap: 14,
    paddingLeft: 20,
  },

  exclusiveBox: {
    width: 180,
    height: 180,
    borderRadius: 22,
  },

  itemTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },

  itemArtist: {
    color: "#bbb",
    fontSize: 14,
    marginTop: 2,
  },
});
