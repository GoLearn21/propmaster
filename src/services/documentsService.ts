import { supabase } from '../lib/supabase';

export interface Document {
  id: string;
  title: string;
  type: 'lease' | 'addendum' | 'notice' | 'agreement' | 'disclosure';
  status: 'draft' | 'sent' | 'partially-signed' | 'completed' | 'expired';
  property: string;
  unit: string;
  recipients: {
    name: string;
    email: string;
    role: 'tenant' | 'landlord' | 'guarantor';
    signed: boolean;
    signedDate?: string;
  }[];
  createdDate: string;
  sentDate?: string;
  completedDate?: string;
  expiryDate?: string;
}

export const documentsService = {
  async getDocuments(): Promise<Document[]> {
    try {
      // First try to get signing_requests which have more metadata
      const { data: signingData, error: signingError } = await supabase
        .from('signing_requests')
        .select(`
          *,
          document:documents(id, file_name, document_type, property_id),
          tenant:tenants(id, first_name, last_name, email),
          lease:leases(
            id,
            unit:units(
              id,
              unit_number,
              property:properties(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!signingError && signingData && signingData.length > 0) {
        return signingData.map(req => {
          const document = req.document as any;
          const tenant = req.tenant as any;
          const lease = req.lease as any;
          const unit = lease?.unit;
          const property = unit?.property;

          // Parse signers from JSONB
          const signers = req.signers as any[] || [];
          const recipients = signers.map((signer: any) => ({
            name: signer.name || 'Unknown',
            email: signer.email || '',
            role: signer.role || 'tenant',
            signed: signer.status === 'signed',
            signedDate: signer.signed_at
          }));

          // Map document type
          let docType: 'lease' | 'addendum' | 'notice' | 'agreement' | 'disclosure' = 'lease';
          const type = document?.document_type?.toLowerCase() || '';
          if (type.includes('addendum')) docType = 'addendum';
          else if (type.includes('notice')) docType = 'notice';
          else if (type.includes('agreement')) docType = 'agreement';
          else if (type.includes('disclosure')) docType = 'disclosure';

          // Map status
          let status: 'draft' | 'sent' | 'partially-signed' | 'completed' | 'expired' = 'draft';
          if (req.status === 'completed' || req.status === 'complete') {
            status = 'completed';
          } else if (req.status === 'sent' || req.status === 'pending') {
            const signedCount = signers.filter((s: any) => s.status === 'signed').length;
            if (signedCount > 0 && signedCount < signers.length) {
              status = 'partially-signed';
            } else {
              status = 'sent';
            }
          } else if (req.status === 'expired') {
            status = 'expired';
          }

          return {
            id: req.id,
            title: document?.file_name || 'Document',
            type: docType,
            status,
            property: property?.name || 'Unknown Property',
            unit: unit?.unit_number || 'Unknown Unit',
            recipients,
            createdDate: req.created_at,
            sentDate: req.created_at,
            completedDate: req.signed_at,
            expiryDate: undefined
          };
        });
      }

      // Fallback to documents table if no signing requests
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          property:properties(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(doc => {
        const property = doc.property as any;
        
        // Map document type
        let docType: 'lease' | 'addendum' | 'notice' | 'agreement' | 'disclosure' = 'lease';
        const type = doc.document_type?.toLowerCase() || '';
        if (type.includes('addendum')) docType = 'addendum';
        else if (type.includes('notice')) docType = 'notice';
        else if (type.includes('agreement')) docType = 'agreement';
        else if (type.includes('disclosure')) docType = 'disclosure';

        return {
          id: doc.id,
          title: doc.file_name || 'Document',
          type: docType,
          status: 'draft',
          property: property?.name || 'Unknown Property',
          unit: 'N/A',
          recipients: [],
          createdDate: doc.created_at,
          sentDate: undefined,
          completedDate: undefined,
          expiryDate: undefined
        };
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }
};
