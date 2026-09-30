import { ID_PREFIXES, IdPrefix, PREFIX_ENTITY_MAP } from './prefixes';
import { ParsedId } from './types';
import { isValidCanonicalId } from './validators';

/**
 * Parses any identifier and returns metadata about its entity type and canonical structure.
 */
export function parseId(rawId: unknown): ParsedId | null {
  if (typeof rawId !== 'string') return null;
  const clean = rawId.trim();
  const parts = clean.split('-');

  if (parts.length !== 2) {
    return null;
  }

  const [prefixStr, randomPart] = parts;
  const prefix = prefixStr.toUpperCase() as IdPrefix;
  const knownPrefixes = Object.values(ID_PREFIXES) as string[];

  if (!knownPrefixes.includes(prefix)) {
    return null;
  }

  const valid = isValidCanonicalId(clean, prefix);
  const entityName = PREFIX_ENTITY_MAP[prefix] || 'Unknown';

  return {
    prefix,
    randomPart,
    canonicalId: `${prefix}-${randomPart.toUpperCase()}`,
    isValid: valid,
    entityName
  };
}
