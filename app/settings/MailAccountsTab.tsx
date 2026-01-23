"use client"

import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RefreshCw, Trash2, Edit, Power } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Account, AccountStatus } from "@/lib/mail"
import { ImapForm } from "@/components/ImapForm"

const getStatusColor = (status: AccountStatus) => {
  switch (status) {
    case 'working':
      return 'bg-green-500'
    case 'trouble':
      return 'bg-red-500'
    case 'disabled':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
}

type ModifyFormData = {
  username: string
  password: string
  host: string
  port: number
  secure: string
  allowUnsignedCertificate: boolean
  spamFolder: string
}

interface MailAccountsTabProps {
  mailAccounts: Account[]
  setMailAccounts: (accounts: Account[]) => void
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void
  accountToDelete: Account | null
  setAccountToDelete: (account: Account | null) => void
  modifyDialogOpen: boolean
  setModifyDialogOpen: (open: boolean) => void
  accountToModify: Account | null
  setAccountToModify: (account: Account | null) => void
  modifyFormData: ModifyFormData
  setModifyFormData: (data: ModifyFormData) => void
  testingModify: boolean
  setTestingModify: (testing: boolean) => void
  testingAccountId: string | null
  setTestingAccountId: (id: string | null) => void
  modifyFolders: { name: string; path: string }[]
  setModifyFolders: (folders: { name: string; path: string }[]) => void
  loadingModifyFolders: boolean
  setLoadingModifyFolders: (loading: boolean) => void
  handleDeleteAccount: (account: Account) => void
  confirmDelete: () => Promise<void>
  handleModifyAccount: (account: Account) => void
  handleTestAccount: (account: Account) => Promise<void>
  handleModifyFormChange: (field: string, value: string | boolean) => void
  handleSaveModify: () => Promise<void>
  handleToggleAccount: (account: Account) => Promise<void>
  handleFetchModifyFolders: () => Promise<void>
}

export default function MailAccountsTab({
  mailAccounts,
  deleteDialogOpen,
  setDeleteDialogOpen,
  accountToDelete,
  modifyDialogOpen,
  setModifyDialogOpen,
  modifyFormData,
  testingModify,
  testingAccountId,
  modifyFolders,
  loadingModifyFolders,
  handleDeleteAccount,
  confirmDelete,
  handleModifyAccount,
  handleTestAccount,
  handleModifyFormChange,
  handleSaveModify,
  handleToggleAccount,
  handleFetchModifyFolders,
}: MailAccountsTabProps) {
  return (
    <>
      <TabsContent value="mail" className="space-y-8">
        <h2 className="text-xl font-semibold">Mail Accounts</h2>
        {mailAccounts.length === 0 ? (
          <p className="text-muted-foreground">No mail accounts configured.</p>
        ) : (
          <div className="space-y-4">
            <TooltipProvider>
              {mailAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(account.status)} cursor-help`}></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Status: {account.status}</p>
                      </TooltipContent>
                    </Tooltip>
                    <div>
                      <p className="font-medium">{account.name || account.config.username}</p>
                      <p className="text-sm text-muted-foreground">{account.type.toUpperCase()} - {account.status}</p>
                    </div>
                  </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestAccount(account)}
                    title="Test Connection"
                    disabled={testingAccountId === account.id}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${testingAccountId === account.id ? 'animate-spin' : ''}`} />
                    {testingAccountId === account.id ? 'Testing...' : 'Test'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAccount(account)}
                    title={account.status === 'disabled' ? 'Enable Account' : 'Disable Account'}
                  >
                    <Power className="h-4 w-4 mr-2" />
                    {account.status === 'disabled' ? 'Enable' : 'Disable'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleModifyAccount(account)} title="Modify">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteAccount(account)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              ))}
            </TooltipProvider>
          </div>
        )}
      </TabsContent>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account {accountToDelete?.name || accountToDelete?.config.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Account</DialogTitle>
            <DialogDescription>Update your account settings.</DialogDescription>
          </DialogHeader>
          <ImapForm
            formData={modifyFormData}
            onChange={handleModifyFormChange}
            prefix="modify-"
            folders={modifyFolders}
            onFetchFolders={handleFetchModifyFolders}
            loadingFolders={loadingModifyFolders}
          />
          <DialogFooter>
            <Button onClick={handleSaveModify} disabled={testingModify}>
              {testingModify ? "Testing..." : "Test and Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
