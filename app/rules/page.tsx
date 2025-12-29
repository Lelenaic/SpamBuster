'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Edit3, Trash2, Power } from 'lucide-react';
import { Rule } from '@/lib/types';
import { Account } from '@/lib/mail/types';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    text: '',
    enabled: true,
    applyToAll: true,
    selectedAccounts: [] as string[],
  });

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
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);



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
        }
      } else {
        const newRule = await window.rulesAPI.create({
          name: formData.name,
          text: formData.text,
          enabled: formData.enabled,
          emailAccounts: formData.applyToAll ? null : formData.selectedAccounts,
        });
        setRules(prev => [...prev, newRule]);
      }
      setFormData({ name: '', text: '', enabled: true, applyToAll: true, selectedAccounts: [] });
      setEditingRule(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
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
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  const handleToggleEnabled = async (rule: Rule) => {
    try {
      const updatedRule = await window.rulesAPI.update(rule.id, { enabled: !rule.enabled });
      if (updatedRule) {
        setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
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
                          ))}
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
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
