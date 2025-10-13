import React from "react";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps,
}: OnboardingLayoutProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-200">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <motion.div
          className="flex w-1/2 flex-1 flex-col justify-center py-20 pl-16"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Brand */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img
              src="/zero hands.svg"
              alt="Onboarding logo"
              className="object-contain"
            />
          </motion.div>

          {/* Form Content */}
          <motion.div
            className="max-w-md flex-1"
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </motion.div>

        {/* Right Side - Image */}
        <motion.div
          className="relative min-h-screen w-1/2 flex-1"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
          <div className="absolute inset-0 bg-transparent p-10">
            <motion.img
              src="/onboarding/image.avif"
              alt="Onboarding background"
              className="h-full w-full rounded-3xl object-cover"
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
