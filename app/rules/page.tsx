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
import { Plus } from 'lucide-react';
import { Rule } from '@/lib/types';
import { Account } from '@/lib/mail/types';

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRule = await window.rulesAPI.create({
        name: formData.name,
        text: formData.text,
        enabled: formData.enabled,
        emailAccounts: formData.applyToAll ? null : formData.selectedAccounts,
      });
      setRules(prev => [...prev, newRule]);
      setFormData({ name: '', text: '', enabled: true, applyToAll: true, selectedAccounts: [] });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rules</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Rule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-2 block">Rule Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="text" className="mb-2 block">Rule Text <span className="text-red-500">*</span></Label>
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
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Rule</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-card rounded-lg shadow p-6">
        {rules.length === 0 ? (
          <p className="text-muted-foreground">No rules configured yet.</p>
        ) : (
          <TooltipProvider>
            <Accordion type="single" collapsible className="w-full">
              {rules.map((rule) => (
                <AccordionItem key={rule.id} value={rule.id}>
                  <AccordionTrigger className="flex items-center gap-2">
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
