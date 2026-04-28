"use client";
import clsx from "clsx";
import type { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Card(props: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "info" | "muted";
}) {
  const toneClass = {
    default: "bg-white border-line",
    // Subtle blue tint — used for "defaults" cards so they stand out from override rules.
    info: "bg-sky-50/60 border-sky-100",
    muted: "bg-slate-50 border-line",
  }[props.tone ?? "default"];
  return (
    <section className={clsx("rounded-lg border p-5", toneClass, props.className)}>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-ink">{props.title}</h2>
        {props.description && <p className="mt-1 text-sm text-subtle">{props.description}</p>}
      </header>
      {props.children}
    </section>
  );
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <label className={clsx("inline-flex items-center gap-2 select-none", props.disabled && "opacity-60")}>
      <span
        role="switch"
        aria-checked={props.checked}
        tabIndex={0}
        onClick={() => !props.disabled && props.onChange(!props.checked)}
        onKeyDown={(e) => {
          if (props.disabled) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            props.onChange(!props.checked);
          }
        }}
        className={clsx(
          "inline-flex h-5 w-9 items-center rounded-full transition-colors",
          props.checked ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            props.checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
      {props.label && <span className="text-sm text-ink">{props.label}</span>}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  className,
  step,
  min,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="number"
      step={step ?? "any"}
      min={min}
      value={value === null ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange(null);
        else {
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }
      }}
      className={clsx(
        "w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
        className
      )}
      {...rest}
    />
  );
}

export function TextInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
        className
      )}
      {...rest}
    />
  );
}

export function Button({
  variant = "secondary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      type="button"
      {...rest}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-white hover:bg-slate-800",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-slate-50",
        variant === "ghost" && "text-subtle hover:text-ink hover:bg-slate-100",
        variant === "danger" && "border border-red-200 bg-white text-red-600 hover:bg-red-50",
        className
      )}
    />
  );
}

export function Chip(props: { children: ReactNode; tone?: "default" | "muted" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        props.tone === "muted" ? "bg-slate-100 text-subtle" : "bg-emerald-50 text-emerald-700"
      )}
    >
      {props.children}
    </span>
  );
}

export function ErrorText(props: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-red-600">{props.children}</p>;
}
