'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Trash2, Power, Copy, Check, BadgeCheck, RefreshCw } from 'lucide-react';
import { Rule } from '@/lib/types';
import { Account } from '@/lib/mail/types';
import { apiClient, CommunityRule, PaginatedResponse } from '@/lib/api';
import { toast } from 'sonner';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [communityRules, setCommunityRules] = useState<CommunityRule[]>([]);
  const [addedRules, setAddedRules] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    text: '',
    enabled: true,
    applyToAll: true,
    selectedAccounts: [] as string[],
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilteringOfficial, setIsFilteringOfficial] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRules = useCallback(async () => {
    if (isLoadingMore || currentPage >= totalPages) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let newRules: PaginatedResponse<CommunityRule>;

      if (searchQuery.trim()) {
        newRules = await apiClient.searchCommunityRulesPaginated(searchQuery, nextPage, officialOnly);
      } else {
        newRules = await apiClient.getCommunityRulesPaginated(nextPage, officialOnly);
      }

      setCommunityRules(prev => [...prev, ...newRules.data]);
      setCurrentPage(newRules.current_page);
      setTotalPages(newRules.last_page);
    } catch (error) {
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, totalPages, isLoadingMore, searchQuery, officialOnly]);

  // Callback ref to set up observer when element is attached
  const setLoadMoreRef = useCallback((node: HTMLDivElement | null) => {
    loadMoreRef.current = node;
    
    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && !isLoadingMore && currentPage < totalPages) {
            loadMoreRules();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );
      
      observer.observe(node);
      observerRef.current = observer;
    }
  }, [currentPage, totalPages, isLoadingMore, loadMoreRules]);

  // Re-observe when community rules change (to re-setup observer with fresh closures)
  useEffect(() => {
    // Trigger ref callback to re-setup observer with fresh closures
    if (loadMoreRef.current) {
      setLoadMoreRef(loadMoreRef.current);
    }
  }, [communityRules, setLoadMoreRef]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedRules, fetchedAccounts] = await Promise.all([
          window.rulesAPI.getAll(),
          window.accountsAPI.getAll(),
        ]);
        setRules(fetchedRules);
        setAccounts(fetchedAccounts);
      } catch (error) {
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchCommunityRules = async () => {
      setIsFilteringOfficial(true);
      try {
        // Fetch community rules with pagination
        const fetchedCommunityRules = await apiClient.getCommunityRulesPaginated(1, officialOnly);
        setCommunityRules(fetchedCommunityRules.data);
        setCurrentPage(fetchedCommunityRules.current_page);
        setTotalPages(fetchedCommunityRules.last_page);
      } catch (error) {
      } finally {
        setIsInitialLoading(false);
        setIsFilteringOfficial(false);
      }
    };

    fetchCommunityRules();
  }, [officialOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        const updatedRule = await window.rulesAPI.update(editingRule.id, {
          name: formData.name,
          text: formData.text,
          enabled: formData.enabled,
          emailAccounts: formData.applyToAll ? null : formData.selectedAccounts,
        });
        if (updatedRule) {
          setRules(prev => prev.map(r => r.id === editingRule.id ? updatedRule : r));
          toast.success('Rule updated successfully');
        }
      } else {
        const newRule = await window.rulesAPI.create({
          name: formData.name,
          text: formData.text,
          enabled: formData.enabled,
          emailAccounts: formData.applyToAll ? null : formData.selectedAccounts,
        });
        setRules(prev => [...prev, newRule]);
        toast.success('Rule created successfully');
      }
      setFormData({ name: '', text: '', enabled: true, applyToAll: true, selectedAccounts: [] });
      setEditingRule(null);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save rule');
    }
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      text: rule.text,
      enabled: rule.enabled,
      applyToAll: rule.emailAccounts === null,
      selectedAccounts: rule.emailAccounts || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await window.rulesAPI.delete(ruleId);
        setRules(prev => prev.filter(r => r.id !== ruleId));
        toast.success('Rule deleted successfully');
      } catch (error) {
        toast.error('Failed to delete rule');
      }
    }
  };

  const handleToggleEnabled = async (rule: Rule) => {
    try {
      const updatedRule = await window.rulesAPI.update(rule.id, { enabled: !rule.enabled });
      if (updatedRule) {
        setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
        toast.success(`Rule ${!rule.enabled ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleAddCommunityRule = async (communityRule: CommunityRule) => {
    try {
      // Use the prompt as the rule text
      const ruleText = communityRule.prompt;

      const newRule = await window.rulesAPI.create({
        name: `${communityRule.name} (Community)`,
        text: ruleText,
        enabled: true,
        emailAccounts: null, // Apply to all accounts by default
      });
      setRules(prev => [...prev, newRule]);
      toast.success('Rule added successfully');

      setAddedRules(prev => new Set(prev).add(communityRule.id));
      setTimeout(() => {
        setAddedRules(prev => {
          const next = new Set(prev);
          next.delete(communityRule.id);
          return next;
        });
      }, 5000);
    } catch (error) {
      toast.error('Failed to add rule');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await apiClient.searchCommunityRulesPaginated(query, 1, officialOnly);
        setCommunityRules(results.data);
        setCurrentPage(results.current_page);
        setTotalPages(results.last_page);
      } catch (error) {
        toast.error('Search failed');
        setCommunityRules([]);
        setTotalPages(1);
      }
    } else {
      // Reload all rules
      try {
        const rules = await apiClient.getCommunityRulesPaginated(1, officialOnly);
        setCommunityRules(rules.data);
        setCurrentPage(rules.current_page);
        setTotalPages(rules.last_page);
      } catch (error) {
        setCommunityRules([]);
        setTotalPages(1);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      const rules = await apiClient.getCommunityRulesPaginated(1, officialOnly);
      setCommunityRules(rules.data);
      setCurrentPage(rules.current_page);
      setTotalPages(rules.last_page);
      setSearchQuery('');
      toast.success('Community rules refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh rules');
      setCommunityRules([]);
      setTotalPages(1);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rules</h1>
      <p className="text-muted-foreground mb-6">
        Rules are instructions sent to the AI to help identify and filter spam emails. Create custom rules to define what constitutes spam for your email accounts.
      </p>
      <Tabs defaultValue="my-rules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-rules">My rules</TabsTrigger>
          <TabsTrigger value="community-rules">Community rules</TabsTrigger>
        </TabsList>
        <TabsContent value="my-rules">
          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex justify-end mb-4">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                   <DialogHeader>
                     <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
                   </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="block">Rule Name <span className="text-red-500">*</span></Label>
                      <p className="text-sm text-muted-foreground mb-2">Only for you to know which one it is</p>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="text" className="block">Rule Text <span className="text-red-500">*</span></Label>
                      <p className="text-sm text-muted-foreground mb-2">This is the prompt sent to the AI</p>
                      <Textarea
                        id="text"
                        value={formData.text}
                        onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: !!checked }))}
                      />
                      <Label htmlFor="enabled">Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="applyToAll"
                        checked={formData.applyToAll}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applyToAll: !!checked }))}
                      />
                      <Label htmlFor="applyToAll">Apply to all email accounts</Label>
                    </div>
                    {!formData.applyToAll && (
                      <div>
                        <Label className="mb-2 block">Select email accounts</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {accounts.map((account) => (
                            <div key={account.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`account-${account.id}`}
                                checked={formData.selectedAccounts.includes(account.id)}
                                onCheckedChange={(checked) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    selectedAccounts: checked
                                      ? [...prev.selectedAccounts, account.id]
                                      : prev.selectedAccounts.filter(id => id !== account.id)
                                  }));
                                }}
                              />
                              <Label htmlFor={`account-${account.id}`}>
                                {account.name || account.config.username}
                              </Label>
                            </div>
                          )) }
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsModalOpen(false);
                        setEditingRule(null);
                        setFormData({ name: '', text: '', enabled: true, applyToAll: true, selectedAccounts: [] });
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit">{editingRule ? 'Update Rule' : 'Create Rule'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          
            {rules.length === 0 ? (
              <p className="text-muted-foreground">No rules configured yet.</p>
            ) : (
              <TooltipProvider>
                <Accordion type="single" collapsible className="w-full">
                  {rules.map((rule) => (
                    <AccordionItem key={rule.id} value={rule.id}>
                      <AccordionTrigger className="flex items-center gap-2 justify-start">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-full ${
                                rule.enabled ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{rule.enabled ? 'Enabled' : 'Disabled'}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-left">{rule.name}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-4">
                          <p className="text-sm text-muted-foreground">{rule.text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Applied to: {rule.emailAccounts === null ? 'All accounts' : `${rule.emailAccounts.length} account(s)`}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(rule)}
                            >
                              <Edit3 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleEnabled(rule)}
                            >
                              <Power className="w-4 h-4 mr-1" />
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TooltipProvider>
            )}
          </div>
        </TabsContent>
        <TabsContent value="community-rules">
          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex gap-2 mb-4 items-center flex-nowrap">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Search community rules..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <Checkbox
                  id="official-only"
                  checked={officialOnly}
                  onCheckedChange={(checked) => setOfficialOnly(!!checked)}
                />
                <Label htmlFor="official-only" className="text-sm whitespace-nowrap">Official only</Label>
              </div>
            </div>
            {isInitialLoading || isFilteringOfficial ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : communityRules.length === 0 ? (
              <p className="text-muted-foreground">No community rules available.</p>
            ) : (
              <>
                <TooltipProvider>
                  <Accordion type="single" collapsible className="w-full">
                    {communityRules.map((rule) => (
                      <AccordionItem key={rule.id} value={rule.id}>
                        <AccordionTrigger className="flex items-center gap-2 justify-start">
                          <span className="text-left">{rule.name}</span>
                          {rule.is_official ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="default">
                                  <BadgeCheck className="w-5 h-5 mr-1" />
                                  Official
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>An official rule is published by the admins and trustworthy</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4">
                            <p className="text-sm text-muted-foreground mb-4">{rule.description}</p>
                            <Separator className="my-4" />
                            <div className="text-xs text-muted-foreground mb-4">
                              <span className="text-sm font-bold">Prompt:</span>
                              <div className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                                {rule.prompt || 'No prompt'}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddCommunityRule(rule)}
                                disabled={addedRules.has(rule.id)}
                              >
                                {addedRules.has(rule.id) ? (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Added
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Add to My Rules
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TooltipProvider>
                {/* Infinite scroll trigger - use callback ref */}
                <div ref={setLoadMoreRef} className="py-4 text-center min-h-[60px]">
                  {isLoadingMore && (
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Loading more...</span>
                    </div>
                  )}
                  {!isLoadingMore && currentPage >= totalPages && communityRules.length > 0 && (
                    <p className="text-sm text-muted-foreground">No more rules to load</p>
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
