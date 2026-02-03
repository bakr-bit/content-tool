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
import type { Brand, BrandAttributes } from '@/types/toplist';

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
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [attributes, setAttributes] = useState<BrandAttributes>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (brand) {
        setName(brand.name);
        setSlug(brand.slug || '');
        setLogoUrl(brand.logoUrl || '');
        setWebsiteUrl(brand.websiteUrl || '');
        setAttributes(brand.attributes);
      } else {
        setName(defaultName);
        setSlug(generateSlug(defaultName));
        setLogoUrl('');
        setWebsiteUrl('');
        setAttributes({});
      }
    }
  }, [open, brand, defaultName]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!brand) {
      setSlug(generateSlug(value));
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleListAttributeChange = (key: string, value: string) => {
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    setAttributes((prev) => ({
      ...prev,
      [key]: items,
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const result = await createBrand({
        name: name.trim(),
        slug: slug || undefined,
        logoUrl: logoUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        attributes,
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
              <Label htmlFor="brand-slug">Slug</Label>
              <Input
                id="brand-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., instant-casino"
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

            {/* Attributes */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Attributes</h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>License</Label>
                  <Input
                    value={(attributes.license as string) || ''}
                    onChange={(e) => handleAttributeChange('license', e.target.value)}
                    placeholder="e.g., MGA, Curaçao"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Welcome Offer</Label>
                  <Input
                    value={(attributes.welcomeOffer as string) || ''}
                    onChange={(e) => handleAttributeChange('welcomeOffer', e.target.value)}
                    placeholder="e.g., 200% up to €7,500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wagering Requirement</Label>
                  <Input
                    value={String(attributes.wageringRequirement || '')}
                    onChange={(e) => handleAttributeChange('wageringRequirement', e.target.value)}
                    placeholder="e.g., 35x"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Withdrawal Time</Label>
                  <Input
                    value={(attributes.withdrawalTime as string) || ''}
                    onChange={(e) => handleAttributeChange('withdrawalTime', e.target.value)}
                    placeholder="e.g., 0-24 hours"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Methods (comma-separated)</Label>
                  <Input
                    value={Array.isArray(attributes.paymentMethods) ? attributes.paymentMethods.join(', ') : ''}
                    onChange={(e) => handleListAttributeChange('paymentMethods', e.target.value)}
                    placeholder="e.g., Visa, MasterCard, Bitcoin"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Highlights (comma-separated)</Label>
                  <Textarea
                    value={Array.isArray(attributes.highlights) ? attributes.highlights.join(', ') : ''}
                    onChange={(e) => handleListAttributeChange('highlights', e.target.value)}
                    placeholder="e.g., Fast payouts, Great game selection, 24/7 support"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Best For</Label>
                  <Input
                    value={(attributes.bestFor as string) || ''}
                    onChange={(e) => handleAttributeChange('bestFor', e.target.value)}
                    placeholder="e.g., High rollers"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Overall Score (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={attributes.overallScore || ''}
                    onChange={(e) => handleAttributeChange('overallScore', e.target.value)}
                    placeholder="e.g., 9.5"
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
