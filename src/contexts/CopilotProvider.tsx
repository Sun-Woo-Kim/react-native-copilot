import mitt, { type Emitter } from "mitt";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { type ScrollView, Dimensions } from "react-native";
import {
  CopilotModal,
  type CopilotModalHandle,
} from "../components/CopilotModal";
import { OFFSET_WIDTH } from "../components/style";
import { useStateWithAwait } from "../hooks/useStateWithAwait";
import { useStepsMap } from "../hooks/useStepsMap";
import { type CopilotOptions, type Step } from "../types";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Events = {
  start: undefined;
  stop: undefined;
  stepChange: Step | undefined;
};

interface CopilotContextType {
  registerStep: (step: Step) => void;
  unregisterStep: (stepName: string) => void;
  currentStep: Step | undefined;
  start: (
    fromStep?: string,
    suppliedScrollView?: ScrollView | null,
  ) => Promise<void>;
  stop: () => Promise<void>;
  goToNext: () => Promise<void>;
  goToNth: (n: number) => Promise<void>;
  goToPrev: () => Promise<void>;
  visible: boolean;
  copilotEvents: Emitter<Events>;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStepNumber: number;
  totalStepsNumber: number;
}

/*
This is the maximum wait time for the steps to be registered before starting the tutorial
At 60fps means 2 seconds
*/
const MAX_START_TRIES = 120;

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotProvider = ({
  verticalOffset = 0,
  children,
  ...rest
}: PropsWithChildren<CopilotOptions>) => {
  const startTries = useRef(0);
  const copilotEvents = useRef(mitt<Events>()).current;
  const modal = useRef<CopilotModalHandle | null>(null);

  const [visible, setVisibility] = useStateWithAwait(false);
  const [scrollView, setScrollView] = useState<ScrollView | null>(null);

  const {
    currentStep,
    currentStepNumber,
    totalStepsNumber,
    getFirstStep,
    getPrevStep,
    getNextStep,
    getNthStep,
    isFirstStep,
    isLastStep,
    setCurrentStepState,
    steps,
    registerStep,
    unregisterStep,
  } = useStepsMap();

  const moveModalToStep = useCallback(
    async (step: Step) => {
      const size = await step?.measure();

      if (!size) {
        return;
      }

      await modal.current?.animateMove({
        width: size.width + OFFSET_WIDTH,
        height: size.height + OFFSET_WIDTH,
        x: size.x - OFFSET_WIDTH / 2,
        y: size.y - OFFSET_WIDTH / 2 + verticalOffset,
      });
    },
    [verticalOffset],
  );

  const setCurrentStep = useCallback(
    async (step?: Step, move: boolean = true) => {
      setCurrentStepState(step);
      copilotEvents.emit("stepChange", step);

      if (scrollView != null && step?.wrapperRef.current) {
        setTimeout(() => {
          const wrapper = step.wrapperRef.current;
          if (!wrapper) return;

          wrapper.measure((fx, fy, width, height, px, py) => {
            wrapper.measureInWindow((x, y, windowWidth, windowHeight) => {
              const screenHeight = Dimensions.get("window").height;

              const elementTop = y;
              const elementBottom = y + height;
              const elementCenter = y + height / 2;

              const safeAreaTop = 150;
              const safeAreaBottom = screenHeight - 150;

              if (
                elementTop < safeAreaTop ||
                elementBottom > safeAreaBottom ||
                elementBottom > screenHeight - 50
              ) {
                const targetPositionOnScreen = screenHeight * 0.4;
                const currentScrollY = py - y;
                const scrollDelta = elementTop - targetPositionOnScreen;

                const newScrollY = currentScrollY + scrollDelta;
                const safeScrollY = Math.max(0, newScrollY);

                console.log("Enhanced scroll calculation:", {
                  elementPosition: {
                    top: elementTop,
                    bottom: elementBottom,
                    center: elementCenter,
                  },
                  elementInScrollView: py,
                  screenHeight,
                  currentScrollY,
                  targetPosition: targetPositionOnScreen,
                  newScrollY: safeScrollY,
                });

                scrollView.scrollTo({
                  y: safeScrollY,
                  animated: true,
                });
              }
            });
          });
        }, 300);
      }

      setTimeout(
        () => {
          if (move && step) {
            void moveModalToStep(step);
          }
        },
        scrollView != null ? 600 : 0,
      );
    },
    [copilotEvents, moveModalToStep, scrollView, setCurrentStepState],
  );

  const start = useCallback(
    async (fromStep?: string, suppliedScrollView: ScrollView | null = null) => {
      if (scrollView == null) {
        setScrollView(suppliedScrollView);
      }

      const currentStep = fromStep ? steps[fromStep] : getFirstStep();

      if (startTries.current > MAX_START_TRIES) {
        startTries.current = 0;
        return;
      }

      if (currentStep == null) {
        startTries.current += 1;
        requestAnimationFrame(() => {
          void start(fromStep);
        });
      } else {
        copilotEvents.emit("start");
        await setCurrentStep(currentStep);
        await moveModalToStep(currentStep);
        await setVisibility(true);
        startTries.current = 0;
      }
    },
    [
      copilotEvents,
      getFirstStep,
      moveModalToStep,
      scrollView,
      setCurrentStep,
      setVisibility,
      steps,
    ],
  );

  const stop = useCallback(async () => {
    await setVisibility(false);
    copilotEvents.emit("stop");
  }, [copilotEvents, setVisibility]);

  const next = useCallback(async () => {
    await setCurrentStep(getNextStep());
  }, [getNextStep, setCurrentStep]);

  const nth = useCallback(
    async (n: number) => {
      await setCurrentStep(getNthStep(n));
    },
    [getNthStep, setCurrentStep],
  );

  const prev = useCallback(async () => {
    await setCurrentStep(getPrevStep());
  }, [getPrevStep, setCurrentStep]);

  const value = useMemo(
    () => ({
      registerStep,
      unregisterStep,
      currentStep,
      start,
      stop,
      visible,
      copilotEvents,
      goToNext: next,
      goToNth: nth,
      goToPrev: prev,
      isFirstStep,
      isLastStep,
      currentStepNumber,
      totalStepsNumber,
    }),
    [
      registerStep,
      unregisterStep,
      currentStep,
      start,
      stop,
      visible,
      copilotEvents,
      next,
      nth,
      prev,
      isFirstStep,
      isLastStep,
      currentStepNumber,
      totalStepsNumber,
    ],
  );

  return (
    <CopilotContext.Provider value={value}>
      <>
        <CopilotModal ref={modal} {...rest} />
        {children}
      </>
    </CopilotContext.Provider>
  );
};

export const useCopilot = () => {
  const value = useContext(CopilotContext);
  if (value == null) {
    throw new Error("You must wrap your app inside CopilotProvider");
  }

  return value;
};
