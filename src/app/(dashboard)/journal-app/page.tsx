import { JournalEntryForm } from '@/components/journal/journal-entry-form';

export default function JournalAppPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <JournalEntryForm type="am" />
        </div>
        <div>
          <JournalEntryForm type="pm" />
        </div>
        <div>
          <JournalEntryForm type="reflection" />
        </div>
      </div>
    </div>
  );
}
