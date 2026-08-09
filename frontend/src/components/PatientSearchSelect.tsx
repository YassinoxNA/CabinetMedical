import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Patient } from "../types";

interface PatientSearchSelectProps {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
  placeholder: string;
  emptyMessage: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  validationMessage?: string;
}

function normalize(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

function patientLabel(patient: Patient) {
  return `${patient.patientNumber} · ${patient.firstName} ${patient.lastName}${patient.cin ? ` · CIN ${patient.cin}` : ""}`;
}

export function PatientSearchSelect({
  patients,
  value,
  onChange,
  placeholder,
  emptyMessage,
  ariaLabel,
  className = "h-12",
  disabled = false,
  required = false,
  validationMessage = ""
}: PatientSearchSelectProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedPatient = patients.find((patient) => patient.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (selectedPatient) setQuery(patientLabel(selectedPatient));
    else if (value) setQuery("");
  }, [selectedPatient, value]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? validationMessage : "");
  }, [required, validationMessage, value]);

  const filteredPatients = useMemo(() => {
    const search = normalize(query.trim());
    if (!search || (selectedPatient && query === patientLabel(selectedPatient))) return patients;
    return patients.filter((patient) => [
      patient.firstName,
      patient.lastName,
      patient.fullName,
      patient.cin,
      patient.patientNumber,
      patient.primaryPhone
    ].some((field) => normalize(field).includes(search)));
  }, [patients, query, selectedPatient]);

  const visiblePatients = filteredPatients.slice(0, 12);

  function selectPatient(patient: Patient) {
    onChange(patient.id);
    setQuery(patientLabel(patient));
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery(selectedPatient ? patientLabel(selectedPatient) : "");
        }
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && visiblePatients[activeIndex] ? `${listboxId}-${visiblePatients[activeIndex].id}` : undefined}
        className={`${className} w-full rounded-xl border border-slate-200 bg-white !pl-11 !pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
        type="text"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={query}
        placeholder={placeholder}
        onFocus={(event) => {
          setOpen(true);
          setActiveIndex(0);
          if (selectedPatient) event.currentTarget.select();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          if (value) onChange("");
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(0, Math.min(index + 1, visiblePatients.length - 1)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && visiblePatients[activeIndex]) {
            event.preventDefault();
            selectPatient(visiblePatients[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery(selectedPatient ? patientLabel(selectedPatient) : "");
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={ariaLabel}
        className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {visiblePatients.length ? visiblePatients.map((patient, index) => (
            <button
              id={`${listboxId}-${patient.id}`}
              key={patient.id}
              type="button"
              role="option"
              aria-selected={patient.id === value}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                index === activeIndex ? "bg-teal-50 text-teal-950" : "text-slate-700 hover:bg-slate-50"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPatient(patient)}
            >
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{patient.firstName} {patient.lastName}</strong>
                <small className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {patient.patientNumber}{patient.cin ? ` · CIN ${patient.cin}` : ""}{patient.primaryPhone ? ` · ${patient.primaryPhone}` : ""}
                </small>
              </span>
              {patient.id === value && <Check className="size-4 shrink-0 text-teal-600" />}
            </button>
          )) : (
            <p className="px-3 py-5 text-center text-xs text-slate-500">{emptyMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
