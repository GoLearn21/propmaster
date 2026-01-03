import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApplicationService } from '../services/applications';
import type { 
  Application,
  ApplicationDocument,
  TenantScreeningResult,
  LeaseDocument,
  ApplicationReview,
  CreateApplicationInput,
  RequestScreeningInput,
  CreateLeaseDocumentInput,
  ApplicationFilters,
  ScreeningFilters
} from '../types';

// Query Keys
export const applicationKeys = {
  all: ['applications'] as const,
  applications: (filters?: ApplicationFilters) => [...applicationKeys.all, 'list', filters] as const,
  application: (id: string) => [...applicationKeys.all, 'detail', id] as const,
  documents: (applicationId: string) => [...applicationKeys.all, 'documents', applicationId] as const,
  screeningResults: (filters?: ScreeningFilters) => [...applicationKeys.all, 'screening', filters] as const,
  leaseDocuments: (applicationId?: string) => [...applicationKeys.all, 'lease-docs', applicationId] as const,
  reviews: (applicationId: string) => [...applicationKeys.all, 'reviews', applicationId] as const,
};

// Application Management Hooks
export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: applicationKeys.applications(filters),
    queryFn: () => ApplicationService.getApplications(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.application(id),
    queryFn: () => ApplicationService.getApplication(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApplicationInput) => ApplicationService.createApplication(input),
    onSuccess: (newApplication) => {
      // Add to applications list
      queryClient.setQueryData(
        applicationKeys.applications(),
        (old: Application[] | undefined) => [newApplication, ...(old || [])]
      );
      
      // Invalidate applications queries
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Application> }) =>
      ApplicationService.updateApplication(id, updates),
    onSuccess: (updatedApplication) => {
      // Update specific application
      queryClient.setQueryData(
        applicationKeys.application(updatedApplication.id),
        updatedApplication
      );
      
      // Invalidate applications list
      queryClient.invalidateQueries({ queryKey: applicationKeys.applications() });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ApplicationService.submitApplication(id),
    onSuccess: (application) => {
      queryClient.setQueryData(applicationKeys.application(application.id), application);
      queryClient.invalidateQueries({ queryKey: applicationKeys.applications() });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ApplicationService.deleteApplication(id),
    onSuccess: (_, deletedId) => {
      // Remove from applications list
      queryClient.setQueryData(
        applicationKeys.applications(),
        (old: Application[] | undefined) =>
          old?.filter(app => app.id !== deletedId) || []
      );
      
      // Remove specific application cache
      queryClient.removeQueries({ queryKey: applicationKeys.application(deletedId) });
    },
  });
}

// Document Management Hooks
export function useApplicationDocuments(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.documents(applicationId),
    queryFn: () => ApplicationService.getApplicationDocuments(applicationId),
    enabled: !!applicationId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      applicationId, 
      file, 
      documentType 
    }: {
      applicationId: string;
      file: File;
      documentType: ApplicationDocument['document_type'];
    }) => ApplicationService.uploadDocument(applicationId, file, documentType),
    onSuccess: (newDocument, variables) => {
      // Add to documents list
      queryClient.setQueryData(
        applicationKeys.documents(variables.applicationId),
        (old: ApplicationDocument[] | undefined) => [newDocument, ...(old || [])]
      );
      
      // Invalidate application to update document count
      queryClient.invalidateQueries({
        queryKey: applicationKeys.application(variables.applicationId),
      });
    },
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, verifiedBy, applicationId }: {
      documentId: string;
      verifiedBy: string;
      applicationId: string;
    }) => ApplicationService.verifyDocument(documentId, verifiedBy),
    onSuccess: (verifiedDocument, variables) => {
      // Update documents list
      queryClient.setQueryData(
        applicationKeys.documents(variables.applicationId),
        (old: ApplicationDocument[] | undefined) =>
          old?.map(doc => doc.id === variables.documentId ? verifiedDocument : doc) || []
      );
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, applicationId }: {
      documentId: string;
      applicationId: string;
    }) => ApplicationService.deleteDocument(documentId),
    onSuccess: (_, variables) => {
      // Remove from documents list
      queryClient.setQueryData(
        applicationKeys.documents(variables.applicationId),
        (old: ApplicationDocument[] | undefined) =>
          old?.filter(doc => doc.id !== variables.documentId) || []
      );
    },
  });
}

// Tenant Screening Hooks
export function useRequestTenantScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestScreeningInput) => ApplicationService.requestTenantScreening(input),
    onSuccess: (screeningResult, variables) => {
      // Add to screening results
      queryClient.setQueryData(
        applicationKeys.screeningResults({ application_id: variables.application_id }),
        (old: TenantScreeningResult[] | undefined) => [screeningResult, ...(old || [])]
      );
      
      // Invalidate application to show screening in progress
      queryClient.invalidateQueries({
        queryKey: applicationKeys.application(variables.application_id),
      });
    },
  });
}

export function useScreeningResults(filters?: ScreeningFilters) {
  return useQuery({
    queryKey: applicationKeys.screeningResults(filters),
    queryFn: () => ApplicationService.getScreeningResults(filters),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

export function useUpdateScreeningResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ApplicationService.updateScreeningResult(id),
    onSuccess: (updatedResult) => {
      // Update screening results lists
      queryClient.invalidateQueries({ queryKey: applicationKeys.screeningResults() });
      
      // Update application if screening is complete
      if (updatedResult.application_id) {
        queryClient.invalidateQueries({
          queryKey: applicationKeys.application(updatedResult.application_id),
        });
      }
    },
  });
}

// eSignature Hooks
export function useCreateLeaseDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeaseDocumentInput) => ApplicationService.createLeaseDocument(input),
    onSuccess: (leaseDocument, variables) => {
      // Add to lease documents
      queryClient.setQueryData(
        applicationKeys.leaseDocuments(variables.application_id),
        (old: LeaseDocument[] | undefined) => [leaseDocument, ...(old || [])]
      );
      
      // Invalidate application
      queryClient.invalidateQueries({
        queryKey: applicationKeys.application(variables.application_id),
      });
    },
  });
}

export function useLeaseDocuments(applicationId?: string) {
  return useQuery({
    queryKey: applicationKeys.leaseDocuments(applicationId),
    queryFn: () => ApplicationService.getLeaseDocuments(applicationId),
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

export function useUpdateLeaseDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ApplicationService.updateLeaseDocumentStatus(id),
    onSuccess: (updatedDocument) => {
      // Invalidate lease documents
      queryClient.invalidateQueries({ queryKey: applicationKeys.leaseDocuments() });
      
      // Update application if document is signed
      if (updatedDocument.application_id) {
        queryClient.invalidateQueries({
          queryKey: applicationKeys.application(updatedDocument.application_id),
        });
      }
    },
  });
}

// Application Review Hooks
export function useCreateApplicationReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      applicationId, 
      reviewData 
    }: {
      applicationId: string;
      reviewData: Omit<ApplicationReview, 'id' | 'application_id' | 'reviewed_at'>;
    }) => ApplicationService.createApplicationReview(applicationId, reviewData),
    onSuccess: (review, variables) => {
      // Add to reviews list
      queryClient.setQueryData(
        applicationKeys.reviews(variables.applicationId),
        (old: ApplicationReview[] | undefined) => [review, ...(old || [])]
      );
      
      // Update application status
      queryClient.invalidateQueries({
        queryKey: applicationKeys.application(variables.applicationId),
      });
      
      // Update applications list
      queryClient.invalidateQueries({ queryKey: applicationKeys.applications() });
    },
  });
}

export function useApplicationReviews(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.reviews(applicationId),
    queryFn: () => ApplicationService.getApplicationReviews(applicationId),
    enabled: !!applicationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Utility hooks for bulk operations
export function useInvalidateApplicationQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
    invalidateApplications: (filters?: ApplicationFilters) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.applications(filters) });
    },
    invalidateApplication: (id: string) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.application(id) });
    },
    invalidateDocuments: (applicationId: string) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.documents(applicationId) });
    },
    invalidateScreeningResults: (filters?: ScreeningFilters) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.screeningResults(filters) });
    },
    invalidateLeaseDocuments: (applicationId?: string) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.leaseDocuments(applicationId) });
    },
  };
}

// Polling hook for real-time updates
export function useApplicationPolling(applicationId: string, enabled = true) {
  return useQuery({
    queryKey: [...applicationKeys.application(applicationId), 'poll'],
    queryFn: () => ApplicationService.getApplication(applicationId),
    enabled: enabled && !!applicationId,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });
}