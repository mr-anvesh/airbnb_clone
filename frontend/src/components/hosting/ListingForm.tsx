'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Upload, ImageIcon } from 'lucide-react';
import { getAmenities, createListing, updateListing, uploadImage } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { PROPERTY_TYPES } from '@/lib/constants';
import type { ListingDetail, Amenity } from '@/types';

interface ListingFormProps {
  listing?: ListingDetail;
  mode: 'create' | 'edit';
}

export default function ListingForm({ listing, mode }: ListingFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [form, setForm] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    property_type: listing?.property_type || 'APARTMENT',
    location: listing?.location || '',
    latitude: listing?.latitude || 0,
    longitude: listing?.longitude || 0,
    price_per_night: listing?.price_per_night || 100,
    max_guests: listing?.max_guests || 2,
    bedrooms: listing?.bedrooms || 1,
    beds: listing?.beds || 1,
    bathrooms: listing?.bathrooms || 1,
    amenity_ids: listing?.amenities?.map((a) => a.id) || [] as number[],
    image_urls: listing?.images?.map((i) => i.image_url) || [''],
  });

  useEffect(() => {
    getAmenities().then(setAmenities).catch(() => {});
  }, []);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAmenity = (id: number) => {
    set(
      'amenity_ids',
      form.amenity_ids.includes(id)
        ? form.amenity_ids.filter((a) => a !== id)
        : [...form.amenity_ids, id]
    );
  };

  const handleFileUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const url = await uploadImage(file);
      const urls = [...form.image_urls];
      urls[idx] = url;
      set('image_urls', urls);
      showToast('Image uploaded!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      price_per_night: Number(form.price_per_night),
      max_guests: Number(form.max_guests),
      bedrooms: Number(form.bedrooms),
      beds: Number(form.beds),
      bathrooms: Number(form.bathrooms),
      images: form.image_urls
        .filter((u) => u.trim())
        .map((url, i) => ({ image_url: url.trim(), display_order: i })),
    };
    try {
      if (mode === 'create') {
        await createListing(payload);
        showToast('Listing created!', 'success');
      } else if (listing) {
        await updateListing(listing.id, payload);
        showToast('Listing updated!', 'success');
      }
      router.push('/hosting');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-hairline rounded-[8px] px-4 py-3 text-sm text-ink outline-none focus:border-ink transition-colors bg-canvas';
  const labelClass = 'block text-sm font-semibold text-ink mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic info */}
      <div className="border border-hairline rounded-[14px] p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Basic information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Cosy apartment in the heart of the city"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              placeholder="Describe your space..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Property type</label>
              <select
                value={form.property_type}
                onChange={(e) => set('property_type', e.target.value)}
                className={inputClass}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                required
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="City, Country"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & capacity */}
      <div className="border border-hairline rounded-[14px] p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Pricing & capacity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { key: 'price_per_night', label: 'Price per night ($)', min: 1 },
            { key: 'max_guests', label: 'Max guests', min: 1 },
            { key: 'bedrooms', label: 'Bedrooms', min: 0 },
            { key: 'beds', label: 'Beds', min: 0 },
            { key: 'bathrooms', label: 'Bathrooms', min: 0 },
          ].map(({ key, label, min }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                type="number"
                min={min}
                value={form[key as keyof typeof form] as number}
                onChange={(e) => set(key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="border border-hairline rounded-[14px] p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Amenities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {amenities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.amenity_ids.includes(a.id)}
                  onChange={() => toggleAmenity(a.id)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-ink">{a.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="border border-hairline rounded-[14px] p-6">
        <h2 className="text-lg font-semibold text-ink mb-2">Photos</h2>
        <p className="text-xs text-muted mb-4">Upload photos or paste image URLs</p>
        <div className="space-y-3">
          {form.image_urls.map((url, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-16 h-16 rounded-[8px] bg-surface-strong overflow-hidden shrink-0 flex items-center justify-center">
                {url ? (
                  <img src={url} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageIcon size={20} className="text-muted-soft" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const urls = [...form.image_urls];
                    urls[i] = e.target.value;
                    set('image_urls', urls);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className={inputClass}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[i]?.click()}
                    disabled={uploadingIdx === i}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingIdx === i ? (
                      <><Loader2 size={12} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload size={12} /> Upload photo</>
                    )}
                  </button>
                  <input
                    ref={(el) => { fileInputRefs.current[i] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(i, file);
                    }}
                  />
                </div>
              </div>
              {form.image_urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => set('image_urls', form.image_urls.filter((_, j) => j !== i))}
                  className="p-2 text-muted hover:text-primary-error transition-colors mt-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('image_urls', [...form.image_urls, ''])}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus size={14} /> Add another photo
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-hairline text-ink font-semibold rounded-[8px] py-3.5 text-sm hover:bg-surface-soft transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-primary hover:bg-primary-active text-white font-semibold rounded-[8px] py-3.5 text-sm transition-colors disabled:bg-primary-disabled disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {mode === 'create' ? 'Create listing' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
