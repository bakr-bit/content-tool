import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuthors } from '@/services/api';
import { getAuthorDisplayName, type AuthorProfile } from '@/types/article';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface AuthorSelectProps {
  value?: string;
  onChange: (authorId: string | undefined) => void;
  onManageClick: () => void;
  onAuthorSelect?: (author: AuthorProfile | undefined) => void;
}

export function AuthorSelect({
  value,
  onChange,
  onManageClick,
  onAuthorSelect,
}: AuthorSelectProps) {
  const [authors, setAuthors] = useState<AuthorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuthors();
      if (result.success && result.data) {
        setAuthors(result.data.authors);
      } else {
        setError(result.error?.message || 'Failed to load authors');
      }
    } catch {
      setError('Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: string) => {
    if (newValue === 'custom') {
      onChange(undefined);
      onAuthorSelect?.(undefined);
    } else {
      onChange(newValue);
      const author = authors.find((a) => a.id === newValue);
      onAuthorSelect?.(author);
    }
  };

  // Separate built-in and custom authors
  const builtInAuthors = authors.filter((a) => a.isBuiltIn);
  const customAuthors = authors.filter((a) => !a.isBuiltIn);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Author</Label>
        <Button variant="link" size="sm" onClick={onManageClick} className="h-auto p-0">
          Manage Authors
        </Button>
      </div>

      <Select
        value={value || 'custom'}
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Loading...' : 'Select an author...'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">
            <span className="text-muted-foreground">Custom (manual settings)</span>
          </SelectItem>

          {builtInAuthors.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Built-in Profiles
              </div>
              {builtInAuthors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(author.firstName, author.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getAuthorDisplayName(author)}</span>
                    {author.site && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {author.site}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Built-in
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {customAuthors.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Custom Profiles
              </div>
              {customAuthors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className="text-xs">
                        {getInitials(author.firstName, author.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getAuthorDisplayName(author)}</span>
                    {author.site && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {author.site}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {value && (
        <p className="text-xs text-muted-foreground">
          Selecting an author will apply their voice settings below.
        </p>
      )}
    </div>
  );
}
