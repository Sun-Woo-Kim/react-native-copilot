import React, { useEffect, useMemo, useRef } from "react";
import { type View } from "react-native";

import { useCopilot } from "../contexts/CopilotProvider";

interface Props {
  name: string;
  order: number;
  text: string;
  children: React.ReactElement<any>;
  active?: boolean;
}

export const CopilotStep = ({
  name,
  order,
  text,
  children,
  active = true,
}: Props) => {
  const registeredName = useRef<string | null>(null);
  const { registerStep, unregisterStep } = useCopilot();
  const wrapperRef = React.useRef<View | null>(null);

  const measure = async () => {
    return await new Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>((resolve) => {
      const measure = () => {
        // Wait until the wrapper element appears
        if (wrapperRef.current != null && "measureInWindow" in wrapperRef.current) {
          wrapperRef.current.measureInWindow((x, y, width, height) => {
            resolve({
              x,
              y,
              width,
              height,
            });
          });
        } else {
          requestAnimationFrame(measure);
        }
      };

      measure();
    });
  };

  useEffect(() => {
    if (active) {
      if (registeredName.current && registeredName.current !== name) {
        unregisterStep(registeredName.current);
      }
      registerStep({
        name,
        text,
        order,
        measure,
        wrapperRef,
        visible: true,
      });
      registeredName.current = name;
    }
  }, [name, order, text, registerStep, unregisterStep, active]);

  useEffect(() => {
    if (active) {
      return () => {
        if (registeredName.current) {
          unregisterStep(registeredName.current);
        }
      };
    }
  }, [name, unregisterStep, active]);

  const copilotProps = useMemo(
    () => ({
      ref: wrapperRef,
      onLayout: () => {}, // Android hack
    }),
    []
  );

  return React.cloneElement(children, { copilot: copilotProps });
};
