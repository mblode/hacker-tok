import { type ClassValue, clsx } from "clsx";
import { type FormatDistanceFnOptions, formatDistanceStrict } from "date-fns";
import { enAU } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatDistanceLocale: Record<string, string> = {
  lessThanXSeconds: "{{count}}s",
  xSeconds: "{{count}}s",
  halfAMinute: "30s",
  lessThanXMinutes: "{{count}}m",
  xMinutes: "{{count}}m",
  aboutXHours: "{{count}}h",
  xHours: "{{count}}h",
  xDays: "{{count}}d",
  aboutXWeeks: "{{count}}w",
  xWeeks: "{{count}}w",
  aboutXMonths: "{{count}}mo",
  xMonths: "{{count}}mo",
  aboutXYears: "{{count}}y",
  xYears: "{{count}}y",
  overXYears: "{{count}}y",
  almostXYears: "{{count}}y",
};

function formatDistance(
  token: string,
  count: string | number,
  options: FormatDistanceFnOptions = {}
) {
  const result = formatDistanceLocale[token].replace(
    "{{count}}",
    count.toString()
  );

  if (options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return `in ${result}`;
    }
    return `${result} ago`;
  }

  return result;
}

const locale = { ...enAU, formatDistance };

export const relativeTime = (time: number) => {
  return formatDistanceStrict(new Date(time * 1000), new Date(), { locale });
};
