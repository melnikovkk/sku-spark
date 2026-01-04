import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { CreateJobForm } from "@/components/dashboard/CreateJobForm";
import { JobFilters } from "@/components/dashboard/JobFilters";
import { JobTable } from "@/components/dashboard/JobTable";
import { BudgetWidget } from "@/components/dashboard/BudgetWidget";
import { AgentChatStream } from "@/components/workspace/AgentChatStream";
import { SKUCard } from "@/components/workspace/SKUCard";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import { EvidenceDrawer } from "@/components/workspace/EvidenceDrawer";
import { ConflictResolutionModal } from "@/components/workspace/ConflictResolutionModal";
import { ExportManager } from "@/components/export/ExportManager";
import { AuditLogView } from "@/components/audit/AuditLogView";
import { ConfigurationPanel } from "@/components/config/ConfigurationPanel";
import { useMockData } from "@/hooks/useMockData";
import type { JobStatus } from "@/types/job";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Index() {
  const [activeView, setActiveView] = useState<'dashboard' | 'workspace' | 'audit' | 'config'>('dashboard');
  const [activeFilter, setActiveFilter] = useState<JobStatus | 'all'>('all');
  const [evidenceDrawer, setEvidenceDrawer] = useState<{ isOpen: boolean; fieldName: string }>({
    isOpen: false,
    fieldName: '',
  });
  const [isPaused, setIsPaused] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'enrichment' | 'export'>('enrichment');

  const {
    jobs,
    selectedJob,
    agentMessages,
    skuData,
    budgetData,
    isProcessing,
    auditEntries,
    systemConfig,
    validationBlockers,
    activeConflict,
    selectJob,
    createJob,
    getEvidence,
    getFilterCounts,
    setSkuData,
    setSystemConfig,
    triggerConflict,
    resolveConflict,
    addAuditEntry,
    removeBlocker,
  } = useMockData();

  const filteredJobs = activeFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === activeFilter);

  const handleSelectJob = useCallback((job: typeof jobs[0]) => {
    selectJob(job);
    setActiveView('workspace');
  }, [selectJob]);

  const handleViewEvidence = useCallback((fieldName: string) => {
    setEvidenceDrawer({ isOpen: true, fieldName });
  }, []);

  const handleToggleLock = useCallback((fieldName: string) => {
    if (!skuData) return;
    
    const field = skuData[fieldName as keyof typeof skuData];
    const isCurrentlyLocked = typeof field === 'object' && field !== null && 'status' in field && field.status === 'locked';
    
    setSkuData(prev => {
      if (!prev) return prev;
      const f = prev[fieldName as keyof typeof prev];
      if (typeof f === 'object' && f !== null && 'status' in f) {
        return {
          ...prev,
          [fieldName]: {
            ...f,
            status: f.status === 'locked' ? 'verified' : 'locked',
          },
        };
      }
      return prev;
    });
    
    // Add audit entry
    if (selectedJob) {
      addAuditEntry({
        action: 'field_lock',
        fieldName,
        beforeValue: String(typeof field === 'object' && 'value' in field ? field.value : ''),
        afterValue: String(typeof field === 'object' && 'value' in field ? field.value : ''),
        userId: 'current-user',
        jobId: selectedJob.id,
      });
    }
    
    toast.success(`Field ${fieldName} ${isCurrentlyLocked ? 'unlocked' : 'locked'}`);
  }, [skuData, setSkuData, selectedJob, addAuditEntry]);

  const handleDecision = useCallback((messageId: string, decision: string) => {
    if (decision === 'accept') {
      toast.success('Evidence accepted');
    } else if (decision === 'select') {
      // Trigger conflict resolution for demo
      triggerConflict('dimensions');
    } else {
      toast.info('Question skipped');
    }
  }, [triggerConflict]);

  const handleVerifyHash = useCallback((evidenceId: string) => {
    toast.info('Verifying hash against live source...');
    setTimeout(() => {
      toast.success('Hash verified - content unchanged');
    }, 1500);
  }, []);

  const handleBulkUpload = useCallback(() => {
    toast.info('CSV upload dialog would open here');
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(prev => !prev);
    toast.info(isPaused ? 'Job resumed' : 'Job paused');
  }, [isPaused]);

  const handleStop = useCallback(() => {
    toast.warning('Job stopped');
    setActiveView('dashboard');
  }, []);

  const handleRequestFix = useCallback((blockerId: string) => {
    toast.info('Agent is searching for missing data...');
    setTimeout(() => {
      removeBlocker(blockerId);
      toast.success('Blocker resolved by agent');
    }, 2000);
  }, [removeBlocker]);

  const handleExport = useCallback((format: 'ozon_xml' | 'yandex_yml' | 'wildberries_csv') => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }, []);

  const handlePublish = useCallback(() => {
    toast.success('Published to all channels successfully!');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header activeView={activeView} onViewChange={setActiveView} />
      
      <main className="h-[calc(100vh-3.5rem)]">
        {activeView === 'dashboard' && (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Create Job Form */}
            <CreateJobForm onCreateJob={createJob} onBulkUpload={handleBulkUpload} />

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Job List - Takes 3 columns */}
              <div className="lg:col-span-3 space-y-4">
                <JobFilters
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  counts={getFilterCounts()}
                />
                <JobTable
                  jobs={filteredJobs}
                  onSelectJob={handleSelectJob}
                  selectedJobId={selectedJob?.id}
                />
              </div>

              {/* Budget Widget - Takes 1 column */}
              <div className="lg:col-span-1">
                <BudgetWidget data={budgetData} />
              </div>
            </div>
          </div>
        )}

        {activeView === 'workspace' && selectedJob && skuData && (
          <div className="h-full flex flex-col">
            {/* Workspace Header */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-4 max-w-7xl mx-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('dashboard')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                
                <Tabs value={workspaceTab} onValueChange={(v) => setWorkspaceTab(v as any)} className="flex-1">
                  <TabsList>
                    <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
                    <TabsTrigger value="export" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export & Publish
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {workspaceTab === 'enrichment' && (
                  <WorkspaceToolbar
                    cost={selectedJob.cost}
                    costLimit={systemConfig.budgetCaps.maxSpendPerSKU}
                    duration={selectedJob.duration}
                    durationLimit={systemConfig.budgetCaps.maxExecutionTime}
                    onPause={handlePause}
                    onStop={handleStop}
                    isPaused={isPaused}
                  />
                )}
              </div>
            </div>

            {/* Workspace Content */}
            {workspaceTab === 'enrichment' ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Agent Chat (60%) */}
                <div className="w-[60%] border-r overflow-hidden">
                  <AgentChatStream
                    messages={agentMessages}
                    onDecision={handleDecision}
                    isProcessing={isProcessing && !isPaused}
                  />
                </div>

                {/* Right Panel - SKU Card (40%) */}
                <div className="w-[40%] overflow-auto p-4 bg-muted/20">
                  <SKUCard
                    data={skuData}
                    onViewEvidence={handleViewEvidence}
                    onToggleLock={handleToggleLock}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <ExportManager
                    skuId={selectedJob.id}
                    blockers={validationBlockers}
                    onRequestFix={handleRequestFix}
                    onExport={handleExport}
                    onPublish={handlePublish}
                  />
                </div>
              </div>
            )}

            {/* Evidence Drawer */}
            <EvidenceDrawer
              isOpen={evidenceDrawer.isOpen}
              onClose={() => setEvidenceDrawer({ isOpen: false, fieldName: '' })}
              fieldName={evidenceDrawer.fieldName}
              evidence={getEvidence(evidenceDrawer.fieldName)}
              onVerifyHash={handleVerifyHash}
            />

            {/* Conflict Resolution Modal */}
            <ConflictResolutionModal
              isOpen={!!activeConflict}
              onClose={() => resolveConflict({ 
                fieldName: activeConflict?.fieldName || '', 
                selectedValue: activeConflict?.claims[0]?.value || '', 
                source: 'left' 
              })}
              conflict={activeConflict}
              onResolve={resolveConflict}
            />
          </div>
        )}

        {activeView === 'audit' && (
          <div className="p-6 max-w-7xl mx-auto">
            <AuditLogView entries={auditEntries} />
          </div>
        )}

        {activeView === 'config' && (
          <div className="p-6 max-w-5xl mx-auto">
            <ConfigurationPanel 
              config={systemConfig} 
              onSave={setSystemConfig} 
            />
          </div>
        )}
      </main>
    </div>
  );
}
