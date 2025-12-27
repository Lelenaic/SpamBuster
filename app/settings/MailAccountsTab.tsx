"use client"

import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Account, AccountStatus, MailProviderFactory } from "@/lib/mail"

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
  handleDeleteAccount: (account: Account) => void
  confirmDelete: () => Promise<void>
  handleModifyAccount: (account: Account) => void
  handleTestAccount: (account: Account) => Promise<void>
  handleModifyFormChange: (field: string, value: string | boolean) => void
  handleSaveModify: () => Promise<void>
  handleToggleAccount: (account: Account) => Promise<void>
}

export default function MailAccountsTab({
  mailAccounts,
  setMailAccounts,
  deleteDialogOpen,
  setDeleteDialogOpen,
  accountToDelete,
  setAccountToDelete,
  modifyDialogOpen,
  setModifyDialogOpen,
  accountToModify,
  setAccountToModify,
  modifyFormData,
  setModifyFormData,
  testingModify,
  setTestingModify,
  testingAccountId,
  setTestingAccountId,
  handleDeleteAccount,
  confirmDelete,
  handleModifyAccount,
  handleTestAccount,
  handleModifyFormChange,
  handleSaveModify,
  handleToggleAccount,
}: MailAccountsTabProps) {
  return (
    <>
      <TabsContent value="mail" className="space-y-8">
        <h2 className="text-xl font-semibold">Mail Accounts</h2>
        {mailAccounts.length === 0 ? (
          <p className="text-muted-foreground">No mail accounts configured.</p>
        ) : (
          <div className="space-y-4">
            {mailAccounts.map(account => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(account.status)}`}></span>
                  <div>
                    <p className="font-medium">{account.name || account.config.username}</p>
                    <p className="text-sm text-muted-foreground">{account.type.toUpperCase()} - Status: {account.status}</p>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modify-username">Username</Label>
              <Input
                id="modify-username"
                type="text"
                value={modifyFormData.username}
                onChange={(e) => handleModifyFormChange("username", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-password">Password</Label>
              <Input
                id="modify-password"
                type="password"
                value={modifyFormData.password}
                onChange={(e) => handleModifyFormChange("password", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-host">Host</Label>
              <Input
                id="modify-host"
                type="text"
                value={modifyFormData.host}
                onChange={(e) => handleModifyFormChange("host", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-port">Port</Label>
              <Input
                id="modify-port"
                type="number"
                value={modifyFormData.port}
                onChange={(e) => handleModifyFormChange("port", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-secure">Security</Label>
              <Select value={modifyFormData.secure} onValueChange={(value) => {
                handleModifyFormChange("secure", value)
                if (value === "false") {
                  handleModifyFormChange("allowUnsignedCertificate", false)
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">TLS/SSL</SelectItem>
                  <SelectItem value="false">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modifyFormData.secure === "true" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="modify-allowUnsignedCertificate"
                  checked={modifyFormData.allowUnsignedCertificate}
                  onCheckedChange={(checked) => handleModifyFormChange("allowUnsignedCertificate", checked)}
                />
                <Label htmlFor="modify-allowUnsignedCertificate" className="text-sm">
                  Allow unsigned SSL certificates
                </Label>
              </div>
            )}
          </div>
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
