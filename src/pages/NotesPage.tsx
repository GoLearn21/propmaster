import { useState, useEffect } from 'react';
import { StickyNote, Plus, Tag, Pin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreateNoteModal from '../components/modals/CreateNoteModal';
import toast from 'react-hot-toast';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [filter]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('note_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
            <p className="text-sm text-gray-600 mt-1">Organize property and task documentation</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadNotes}
        defaultType={filter === 'all' ? 'general' : filter}
      />

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{notes.length}</p>
              </div>
              <StickyNote className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pinned</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {notes.filter(n => n.is_pinned).length}
                </p>
              </div>
              <Pin className="w-8 h-8 text-teal-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Property Notes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {notes.filter(n => n.note_type === 'property').length}
                </p>
              </div>
              <Tag className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Task Notes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {notes.filter(n => n.note_type === 'task').length}
                </p>
              </div>
              <Tag className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex space-x-4">
          {['all', 'property', 'tenant', 'task', 'general'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === type ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{note.title}</h3>
                {note.is_pinned && <Pin className="w-5 h-5 text-teal-600" />}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">{note.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {note.note_type}
                  </span>
                  {note.category && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {note.category}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
