import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createNote, updateNote, type Note } from '../../services/notesService';
import toast from 'react-hot-toast';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  note?: Note | null;
  defaultType?: string;
}

export default function CreateNoteModal({
  isOpen,
  onClose,
  onSuccess,
  note,
  defaultType = 'general'
}: CreateNoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entity_type: defaultType,
    entity_id: '',
    category: '',
    is_pinned: false,
    created_by: 'current-user' // Replace with actual user
  });

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        entity_type: note.entity_type,
        entity_id: note.entity_id || '',
        category: note.category || '',
        is_pinned: note.is_pinned,
        created_by: note.created_by
      });
    }
  }, [note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const noteData = {
        ...formData,
        entity_id: formData.entity_id || undefined
      };

      if (note) {
        await updateNote(note.id, noteData);
        toast.success('Note updated successfully');
      } else {
        await createNote(noteData as any);
        toast.success('Note created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {note ? 'Edit Note' : 'Create New Note'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Note title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              required
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="general">General</option>
              <option value="property">Property</option>
              <option value="task">Task</option>
              <option value="tenant">Tenant</option>
              <option value="unit">Unit</option>
              <option value="lease">Lease</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="e.g., Maintenance, Legal, Financial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Note content..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_pinned"
              checked={formData.is_pinned}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="is_pinned" className="ml-2 text-sm text-gray-700">
              Pin this note
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
