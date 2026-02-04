import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createBrand } from '@/services/toplist-api';
import type { Brand } from '@/types/toplist';

interface BrandEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (brand: Brand) => void;
  brand?: Brand;
  defaultName?: string;
}

export function BrandEditor({
  open,
  onOpenChange,
  onSave,
  brand,
  defaultName = '',
}: BrandEditorProps) {
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [defaultBonus, setDefaultBonus] = useState('');
  const [defaultRating, setDefaultRating] = useState('');
  const [terms, setTerms] = useState('');
  const [license, setLicense] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (brand) {
        setName(brand.name);
        setBrandId(brand.brandId);
        setLogoUrl(brand.defaultLogo || '');
        setWebsiteUrl(brand.website || '');
        setDefaultBonus(brand.defaultBonus || '');
        setDefaultRating(brand.defaultRating?.toString() || '');
        setTerms(brand.terms || '');
        setLicense(brand.license || '');
        setPros(brand.pros?.join(', ') || '');
        setCons(brand.cons?.join(', ') || '');
      } else {
        setName(defaultName);
        setBrandId(generateBrandId(defaultName));
        setLogoUrl('');
        setWebsiteUrl('');
        setDefaultBonus('');
        setDefaultRating('');
        setTerms('');
        setLicense('');
        setPros('');
        setCons('');
      }
    }
  }, [open, brand, defaultName]);

  const generateBrandId = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!brand) {
      setBrandId(generateBrandId(value));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !brandId.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const prosArray = pros.split(',').map((s) => s.trim()).filter(Boolean);
      const consArray = cons.split(',').map((s) => s.trim()).filter(Boolean);

      const result = await createBrand({
        brandId: brandId.trim(),
        name: name.trim(),
        website: websiteUrl || undefined,
        defaultLogo: logoUrl || undefined,
        defaultBonus: defaultBonus || undefined,
        defaultRating: defaultRating ? parseFloat(defaultRating) : undefined,
        terms: terms || undefined,
        license: license || undefined,
        pros: prosArray.length > 0 ? prosArray : undefined,
        cons: consArray.length > 0 ? consArray : undefined,
      });

      if (result.success && result.data) {
        onSave(result.data);
      } else {
        setError(result.error?.message || 'Failed to save brand');
      }
    } catch (err) {
      console.error('Failed to save brand:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{brand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          <DialogDescription>
            {brand ? 'Update the brand details and attributes.' : 'Enter brand details to add it to your library.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name *</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Instant Casino"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-id">Brand ID *</Label>
              <Input
                id="brand-id"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                placeholder="e.g., instant-casino"
                disabled={!!brand}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-website">Website URL</Label>
              <Input
                id="brand-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo URL</Label>
              <Input
                id="brand-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Brand Details */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Brand Details</h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Default Bonus</Label>
                  <Input
                    value={defaultBonus}
                    onChange={(e) => setDefaultBonus(e.target.value)}
                    placeholder="e.g., 200% up to €7,500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Rating (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={defaultRating}
                    onChange={(e) => setDefaultRating(e.target.value)}
                    placeholder="e.g., 9.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>License</Label>
                  <Input
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="e.g., MGA, Curaçao"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Terms</Label>
                  <Input
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="e.g., 18+ T&Cs apply"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pros (comma-separated)</Label>
                  <Textarea
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    placeholder="e.g., Fast payouts, Great game selection, 24/7 support"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cons (comma-separated)</Label>
                  <Textarea
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    placeholder="e.g., High wagering, Limited countries"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : brand ? 'Save Changes' : 'Add Brand'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
