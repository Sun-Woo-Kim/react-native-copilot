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
            const screenHeight = Dimensions.get("window").height;

            const elementTopInScrollView = py;
            const elementHeight = height;
            const elementCenter = py + height / 2;

            let targetPositionOnScreen;
            let targetScrollY;

            if (elementHeight > screenHeight * 0.7) {
              targetPositionOnScreen = 50;
              targetScrollY = elementTopInScrollView - targetPositionOnScreen;
            } else {
              const screenCenter = screenHeight / 2;
              targetScrollY = elementCenter - screenCenter;

              const bottomBuffer = 200;
              const wouldBeBottomPosition =
                elementTopInScrollView - targetScrollY + elementHeight;

              if (wouldBeBottomPosition > screenHeight - bottomBuffer) {
                targetPositionOnScreen = screenHeight * 0.3;
                targetScrollY = elementTopInScrollView - targetPositionOnScreen;
              }
            }

            const safeScrollY = Math.max(0, Math.round(targetScrollY));

            console.log("Enhanced scroll calculation:", {
              step: step.name,
              element: {
                top: elementTopInScrollView,
                height: elementHeight,
                center: elementCenter,
              },
              screen: {
                height: screenHeight,
                targetPosition: targetPositionOnScreen || screenHeight / 2,
              },
              scroll: {
                calculated: targetScrollY,
                safe: safeScrollY,
              },
            });

            const executeScroll = () => {
              scrollView.scrollTo({
                y: safeScrollY,
                animated: true,
              });

              requestAnimationFrame(() => {
                scrollView.scrollTo({
                  y: safeScrollY,
                  animated: true,
                });

                setTimeout(() => {
                  scrollView.scrollTo({
                    y: safeScrollY,
                    animated: false,
                  });
                }, 100);
              });
            };

            executeScroll();

            let retryCount = 0;
            const maxRetries = 5;

            const verifyScroll = () => {
              setTimeout(() => {
                if (wrapper && scrollView && retryCount < maxRetries) {
                  wrapper.measureInWindow((x, y, windowWidth, windowHeight) => {
                    const minVisibleTop = 100;
                    const minVisibleBottom = screenHeight - 200;
                    const isWellPositioned =
                      y >= minVisibleTop && y <= minVisibleBottom;

                    const elementBottom = y + elementHeight;
                    const isBottomVisible = elementBottom <= screenHeight;

                    if (
                      !isWellPositioned ||
                      (elementHeight < screenHeight * 0.7 && !isBottomVisible)
                    ) {
                      retryCount++;
                      console.log(`Retry scroll ${retryCount}/${maxRetries}:`, {
                        currentY: y,
                        elementBottom,
                        screenHeight,
                        willRetry: retryCount < maxRetries,
                      });

                      if (retryCount > 2) {
                        const aggressiveScrollY =
                          elementTopInScrollView - minVisibleTop;
                        scrollView.scrollTo({
                          y: Math.max(0, aggressiveScrollY),
                          animated: false,
                        });
                      } else {
                        executeScroll();
                      }

                      if (retryCount < maxRetries) {
                        verifyScroll();
                      }
                    } else {
                      console.log(`Scroll successful for ${step.name}:`, {
                        finalY: y,
                        elementBottom,
                        isWellPositioned,
                        isBottomVisible,
                      });
                    }
                  });
                }
              }, 500);
            };

            verifyScroll();
          });
        }, 400);
      }

      setTimeout(
        () => {
          if (move && step) {
            void moveModalToStep(step);
          }
        },
        scrollView != null ? 1200 : 0,
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
