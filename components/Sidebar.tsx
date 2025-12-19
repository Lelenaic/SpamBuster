"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconBrandGmail, IconMail, IconChevronDown, IconSettings, IconPlus } from "@tabler/icons-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      {/* Account Selector */}
      <div className="p-4 border-b border-gray-700">
        <div className="cursor-pointer hover:bg-gray-800 p-2 rounded mb-2" onClick={() => { setIsOpen(!isOpen); }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IconBrandGmail className="w-6 h-6" />
              <span className="text-sm text-white">user@gmail.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <IconChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
        {/* Dropdown content */}
        {isOpen && (
        <div className="space-y-1 border border-gray-600 rounded p-2">
          <div className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded cursor-pointer">
            <IconBrandGmail className="w-5 h-5" />
            <span className="text-sm text-white">user@gmail.com</span>
            <span className="w-2 h-2 bg-green-500 rounded-full ml-auto"></span>
          </div>
          <div className="flex items-center space-x-3 p-2 hover:bg-gray-600 rounded cursor-pointer bg-gray-700">
            <IconPlus className="w-5 h-5" />
            <span className="text-sm text-white">Add an account</span>
          </div>
        </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col justify-between p-4">
        {/* Top */}
        <div>
          <Button variant="ghost" className="w-full justify-start !text-white hover:bg-gray-800 cursor-pointer">
            <IconMail className="w-5 h-5 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Bottom */}
        <div>
          <Button variant="ghost" className="w-full justify-start !text-white hover:bg-gray-800 cursor-pointer">
            <IconSettings className="w-5 h-5 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
