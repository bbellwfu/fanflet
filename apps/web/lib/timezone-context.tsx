"use client";

import { createContext, useContext } from "react";

const TimezoneContext = createContext<string | null>(null);

interface TimezoneProviderProps {
  timezone: string | null;
  children: React.ReactNode;
}

function TimezoneProvider({ timezone, children }: TimezoneProviderProps) {
  return (
    <TimezoneContext value={timezone}>{children}</TimezoneContext>
  );
}

function useTimezone(): string | null {
  return useContext(TimezoneContext);
}

export { TimezoneProvider, useTimezone };
