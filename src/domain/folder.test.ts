import { describe, expect, it } from 'vitest';
import { folderLabel } from './folder';

describe('folderLabel', () => {
  it('lit un dossier Android (SAF)', () => {
    expect(folderLabel('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FAlam')).toBe('Documents/Alam');
  });
  it('dossier racine du stockage', () => {
    expect(folderLabel('content://com.android.externalstorage.documents/tree/primary%3A')).toBe('Stockage interne');
  });
  it('adresse de fichier classique', () => {
    expect(folderLabel('file:///data/user/0/app/files/exports/')).toBe('exports');
  });
  it('vide', () => {
    expect(folderLabel(null)).toBe('');
  });
});
