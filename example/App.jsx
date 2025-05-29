import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CopilotProvider,
  CopilotStep,
  walkthroughable,
  useCopilot,
} from "react-native-copilot";

const WalkthroughableText = walkthroughable(Text);
const WalkthroughableImage = walkthroughable(Image);

function App() {
  const { start, copilotEvents } = useCopilot();
  const [secondStepActive, setSecondStepActive] = useState(true);
  const [lastEvent, setLastEvent] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    copilotEvents.on("stepChange", (step) => {
      setLastEvent(`stepChange: ${step.name}`);
    });
    copilotEvents.on("start", () => {
      setLastEvent(`start`);
    });
    copilotEvents.on("stop", () => {
      setLastEvent(`stop`);
    });
  }, [copilotEvents]);

  const startTutorial = () => {
    // ScrollView ref를 start 함수에 전달
    start(undefined, scrollViewRef.current);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <CopilotStep
          text="Hey! This is the first step of the tour!"
          order={1}
          name="openApp"
        >
          <WalkthroughableText style={styles.title}>
            {'Welcome to the demo of\n"React Native Copilot"'}
          </WalkthroughableText>
        </CopilotStep>

        <View style={styles.middleView}>
          <CopilotStep
            active={secondStepActive}
            text="Here goes your profile picture!"
            order={2}
            name="secondText"
          >
            <WalkthroughableImage
              source={{
                uri: "https://pbs.twimg.com/profile_images/527584017189982208/l3wwN-l-_400x400.jpeg",
              }}
              style={styles.profilePhoto}
            />
          </CopilotStep>
          <View style={styles.activeSwitchContainer}>
            <Text>Profile photo step activated?</Text>
            <View style={{ flexGrow: 1 }} />
            <Switch
              onValueChange={(secondStepActive) =>
                setSecondStepActive(secondStepActive)
              }
              value={secondStepActive}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={startTutorial}>
            <Text style={styles.buttonText}>START THE TUTORIAL!</Text>
          </TouchableOpacity>
          <View style={styles.eventContainer}>
            <Text>{lastEvent && `Last event: ${lastEvent}`}</Text>
          </View>
        </View>

        {/* 스크롤 테스트를 위한 추가 컨텐츠 */}
        <View style={styles.scrollTestContainer}>
          <CopilotStep
            text="This is a step in the middle of the scroll view!"
            order={4}
            name="middleStep"
          >
            <WalkthroughableText style={styles.middleStepText}>
              Middle Step (스크롤 중간)
            </WalkthroughableText>
          </CopilotStep>

          <View style={styles.spacer} />

          <CopilotStep
            text="This step is near the bottom of the scroll view."
            order={5}
            name="bottomStep"
          >
            <WalkthroughableText style={styles.bottomStepText}>
              Bottom Step (스크롤 하단)
            </WalkthroughableText>
          </CopilotStep>

          <View style={styles.largeContent}>
            <Text style={styles.contentText}>
              이 영역은 스크롤 테스트를 위한 긴 컨텐츠입니다.{"\n"}
              Copilot이 자동으로 스크롤하여 각 단계를 화면에 표시하는지 확인할
              수 있습니다.{"\n\n"}
              스크롤뷰에서 Copilot 사용 방법:{"\n"}
              1. ScrollView에 ref를 설정{"\n"}
              2. start() 함수 호출 시 ScrollView ref를 두 번째 매개변수로 전달
              {"\n"}
              3. Copilot이 자동으로 각 단계로 스크롤{"\n\n"}
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.{"\n\n"}
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident, sunt in culpa qui officia deserunt mollit
              anim id est laborum.{"\n\n"}
              이제 React Native 0.76 New Architecture와 완전 호환됩니다!
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <CopilotStep
            text="Here is an item in the corner of the screen."
            order={3}
            name="thirdText"
          >
            <WalkthroughableText style={styles.tabItem}>
              <Ionicons name="apps" size={25} color="#888" />
            </WalkthroughableText>
          </CopilotStep>

          <Ionicons
            style={styles.tabItem}
            name="airplane"
            size={25}
            color="#888"
          />
          <Ionicons
            style={styles.tabItem}
            name="ios-globe"
            size={25}
            color="#888"
          />
          <Ionicons
            style={styles.tabItem}
            name="ios-navigate-outline"
            size={25}
            color="#888"
          />
          <Ionicons
            style={styles.tabItem}
            name="ios-rainy"
            size={25}
            color="#888"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AppwithProvider = () => (
  <CopilotProvider
    stopOnOutsideClick
    androidStatusBarVisible
    tooltipTextColor="#333333"
    tooltipStyle={{ backgroundColor: "#f0f0f0" }}
  >
    <App />
  </CopilotProvider>
);

export default AppwithProvider;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingTop: 25,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
  },
  profilePhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginVertical: 20,
  },
  middleView: {
    alignItems: "center",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#2980b9",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tabItem: {
    flex: 1,
    textAlign: "center",
  },
  activeSwitchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
    paddingHorizontal: 25,
  },
  eventContainer: {
    marginTop: 20,
  },
  scrollTestContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  middleStepText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e74c3c",
    textAlign: "center",
    padding: 15,
    backgroundColor: "#ffeaa7",
    borderRadius: 10,
    marginVertical: 20,
  },
  bottomStepText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00b894",
    textAlign: "center",
    padding: 15,
    backgroundColor: "#00cec9",
    borderRadius: 10,
    marginVertical: 20,
  },
  spacer: {
    height: 100,
  },
  largeContent: {
    backgroundColor: "#ddd",
    padding: 20,
    borderRadius: 10,
    margin: 20,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
  },
});
