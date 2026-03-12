"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface CountdownProps {
  targetDate: string;
  locale?: string;
  compact?: boolean;
}

export function Countdown({ targetDate, locale = "tr", compact = false }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));
  const t = useTranslations("countdown");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <span className="text-rose-500 font-medium text-xs">
        {t("expired")}
      </span>
    );
  }

  if (compact) {
    if (timeLeft.days > 30) {
      return (
        <span className="text-xs text-gray-500">
          {timeLeft.days} {t("daysShort")}
        </span>
      );
    }
    if (timeLeft.days > 0) {
      return (
        <span className="text-xs font-medium text-amber-600">
          {timeLeft.days}{t("daysShort")} {timeLeft.hours}{t("hoursShort")}
        </span>
      );
    }
    return (
      <span className="text-xs font-bold text-rose-500 animate-pulse">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  // Full countdown display
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1.5">
        <TimeBlock value={timeLeft.days} label={t("days")} />
        <span className="text-lg font-bold text-gray-400 self-start mt-1">:</span>
        <TimeBlock value={timeLeft.hours} label={t("hours")} />
        <span className="text-lg font-bold text-gray-400 self-start mt-1">:</span>
        <TimeBlock value={timeLeft.minutes} label={t("minutes")} />
        <span className="text-lg font-bold text-gray-400 self-start mt-1">:</span>
        <TimeBlock value={timeLeft.seconds} label={t("seconds")} />
      </div>
      <p className="mt-1.5 text-[10px] text-gray-400">
        {new Date(targetDate).toLocaleString(locale === "tr" ? "tr-TR" : locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  const isUrgent = value < 3 && (label.length > 2); // days-like labels are longer
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-lg px-2 py-1 text-center min-w-[36px] ${
        isUrgent ? "bg-rose-50 dark:bg-rose-900/20" : "bg-gray-100 dark:bg-gray-800"
      }`}>
        <span className={`text-lg font-bold tabular-nums ${
          isUrgent ? "text-rose-600" : "text-gray-900 dark:text-gray-100"
        }`}>
          {pad(value)}
        </span>
      </div>
      <span className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getTimeLeft(targetDate: string) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}
