'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CategoryIcon } from './category-icon';
import { inputClass, labelClass } from './styles';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

type Category = { id: string; name: string };

export function RequestWizard({
  categories,
  maxUploadMb,
}: {
  categories: Category[];
  maxUploadMb: number;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id ?? '');
  const [description, setDescription] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [preferredAt, setPreferredAt] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);

  const selectedCatObj = categories.find((c) => c.id === selectedCategory);

  const validateStep1 = () => {
    if (!selectedCategory) {
      setStepError('Please select a service category.');
      return false;
    }
    if (description.trim().length < 10) {
      setStepError('Please describe what needs doing in at least 10 characters.');
      return false;
    }
    setStepError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!area.trim()) {
      setStepError('Please enter your area or neighbourhood.');
      return false;
    }
    if (!address.trim()) {
      setStepError('Please enter your street address.');
      return false;
    }
    setStepError(null);
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    setStepError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setSelectedFiles(names);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Service & Job', icon: FileText },
            { num: 2, title: 'Location & Time', icon: MapPin },
            { num: 3, title: 'Photos & Submit', icon: Upload },
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const Icon = s.icon;
            return (
              <button
                type="button"
                key={s.num}
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  if (s.num === 2 && validateStep1()) setStep(2);
                  if (s.num === 3 && validateStep1() && validateStep2()) setStep(3);
                }}
                className="flex flex-1 flex-col items-center gap-1.5 focus:outline-none"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border-2 transition font-bold text-sm ${
                    isCompleted
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isCurrent
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-blue-900 font-bold' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {stepError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{stepError}</span>
        </div>
      ) : null}

      {/* Step 1: Category & Details */}
      <div className={step === 1 ? 'block space-y-5' : 'hidden'}>
        <div>
          <label className={labelClass}>Select service category</label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((c) => {
              const active = selectedCategory === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setStepError(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 text-center transition ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CategoryIcon name={c.name} className="h-6 w-6" />
                  <span className="text-xs font-bold leading-tight">{c.name}</span>
                </button>
              );
            })}
          </div>
          {/* Hidden select to link with native formData */}
          <select
            name="category_id"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            What needs doing?
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setStepError(null);
            }}
            rows={5}
            maxLength={2000}
            placeholder="Describe the issue, work required, approximate dimensions, or any access instructions..."
            className={inputClass}
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-500">
            <span>Minimum 10 characters</span>
            <span className={description.length > 1900 ? 'text-amber-600 font-bold' : ''}>
              {description.length} / 2000
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            <span>Continue to location</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Step 2: Location & Timing */}
      <div className={step === 2 ? 'block space-y-5' : 'hidden'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="area" className={labelClass}>
              Area / Neighbourhood
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="area"
                name="area"
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setStepError(null);
                }}
                maxLength={120}
                placeholder="e.g. Central District, West End"
                className={`${inputClass} pl-9`}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Shared with providers before quote acceptance.</p>
          </div>

          <div>
            <label htmlFor="preferred_at" className={labelClass}>
              Preferred date & time (optional)
            </label>
            <div className="relative">
              <input
                id="preferred_at"
                name="preferred_at"
                type="datetime-local"
                value={preferredAt}
                onChange={(e) => setPreferredAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Leave blank if your schedule is flexible.</p>
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Full street address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setStepError(null);
            }}
            maxLength={200}
            placeholder="House / apartment number, street name"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Private and confidential. Shared only with the single provider whose quote you accept.
          </p>
        </div>

        {/* Optional coordinates */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-bold text-slate-700">Map coordinates (optional)</p>
          <p className="mt-0.5 text-xs text-slate-500">Optional map pin coordinates for accurate routing.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="latitude" className="mb-1 block text-xs font-medium text-slate-600">Latitude</label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                inputMode="decimal"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 40.7128"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="longitude" className="mb-1 block text-xs font-medium text-slate-600">Longitude</label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                inputMode="decimal"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. -74.0060"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            <span>Continue to photos & review</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Step 3: Photos & Final Review */}
      <div className={step === 3 ? 'block space-y-5' : 'hidden'}>
        <div>
          <label className={labelClass}>Job Photos (optional)</label>
          <p className="text-xs text-slate-500 mb-2.5">
            Clear photos help providers calculate accurate estimates for labour and materials. Up to 3 photos (JPG, PNG, WebP), max {maxUploadMb} MB each.
          </p>

          <label
            htmlFor="photos"
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/80"
          >
            <Upload className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">Click to upload photos</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG or WebP up to {maxUploadMb} MB</p>
            <input
              id="photos"
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {selectedFiles.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Selected files ({selectedFiles.length}):</p>
              <ul className="flex flex-wrap gap-2">
                {selectedFiles.map((name, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span className="truncate max-w-44">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <h3 className="font-bold text-slate-900 text-sm">Review your request</h3>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
            <div>
              <span className="text-slate-500">Service:</span>
              <p className="font-semibold text-slate-900">{selectedCatObj?.name}</p>
            </div>
            <div>
              <span className="text-slate-500">Area:</span>
              <p className="font-semibold text-slate-900">{area || 'Not specified'}</p>
            </div>
          </div>
          <div>
            <span className="text-slate-500">Preferred timing:</span>
            <p className="font-semibold text-slate-900">
              {preferredAt ? new Date(preferredAt).toLocaleString() : 'Flexible'}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Description:</span>
            <p className="font-medium text-slate-800 line-clamp-2">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <SubmitRequestButton />
        </div>
      </div>
    </div>
  );
}

function SubmitRequestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4" />
      <span>{pending ? 'Submitting request…' : 'Submit request'}</span>
    </button>
  );
}
