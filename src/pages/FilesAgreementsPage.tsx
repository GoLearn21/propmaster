import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function FilesAgreementsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*, properties(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('document_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>;
  }

  const stats = {
    total: documents.length,
    leases: documents.filter(d => d.document_type === 'lease').length,
    contracts: documents.filter(d => d.document_type === 'contract').length,
    legal: documents.filter(d => d.document_type === 'legal').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Files & Agreements</h1>
            <p className="text-sm text-gray-600 mt-1">Manage documents, leases, and contracts</p>
          </div>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Leases</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.leases}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Contracts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.contracts}</p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Legal Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.legal}</p>
              </div>
              <Folder className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex space-x-4">
          {['all', 'lease', 'contract', 'legal', 'photo', 'other'].map((type) => (
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

      {/* Documents Table */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.file_name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      doc.document_type === 'lease' ? 'bg-blue-100 text-blue-800' :
                      doc.document_type === 'contract' ? 'bg-green-100 text-green-800' :
                      doc.document_type === 'legal' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.document_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.properties?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-teal-600 hover:text-teal-800">
                      <Download className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
