import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const printLog = (...args: any[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[${new Date().toISOString()}]`, ...args);

}