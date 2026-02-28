"use client";

import { useState } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import VerificationModal from "./VerificationModal";

export default function Navbar() {
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">MedExNet</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              약품등록
            </Link>

            <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </button>

            {showMenu && (
              <UserMenu
                onClose={() => setShowMenu(false)}
                onVerify={() => {
                  setShowMenu(false);
                  setShowModal(true);
                }}
              />
            )}
          </div>
          </div>
        </div>
      </header>

      {showModal && <VerificationModal onClose={() => setShowModal(false)} />}
    </>
  );
}
