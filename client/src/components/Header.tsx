import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import AssignProfessionals from "./assessment/assign-professionals";
import { useAuth } from "@/context/auth-context";
import { Project } from "@/types/workspace";

interface HeaderProps {
  canSwitchRole: boolean;
  workspaceView: "admin" | "assessor";
  setWorkspaceView: Dispatch<SetStateAction<"admin" | "assessor">>;
  setShowQs: (boolean: true | false) => void;
  setShowReport: (boolean: true | false) => void;
  setEditingDetails: (boolean: true | false) => void;
  setSetup: (boolean: true | false) => void;
  setBrandingOpen: (boolean: true | false) => void;
  setMessage: (
    string:
      | "Admin workspace"
      | "Assessor workspace · capture, details and sign-off"
      | "",
  ) => void;
  setShowWelcome: (boolean: true | false) => void;
  isAdmin: boolean;
  project: Project | null;
  setProject: (Project: Project | null) => void;
}

export default function Header({
  canSwitchRole,
  workspaceView,
  setWorkspaceView,
  setShowQs,
  setShowReport,
  setEditingDetails,
  setSetup,
  setBrandingOpen,
  setMessage,
  setShowWelcome,
  isAdmin,
  project,
  setProject,
}: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="top">
      <div className="brand">
        FACILITY <span>CONDITION ASSESSMENT</span>
        <small>Field capture • Functional area to component</small>
      </div>

      <div className="actions">
        {canSwitchRole && (
          <label className="workspace-switch">
            <select
              aria-label="Choose workspace"
              value={workspaceView}
              onChange={(e) => {
                const view = e.target.value as "admin" | "assessor";
                document.cookie = `fca_workspace_view=${view}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                const check =
                  view === "admin"
                    ? "Admin workspace"
                    : "Assessor workspace · capture, details and sign-off";
                setWorkspaceView(view);
                setShowReport(false);
                setShowQs(false);
                setEditingDetails(false);
                setSetup(false);
                setBrandingOpen(false);
                setMessage(check);
              }}
            >
              <option value="admin">Admin</option>
              <option value="assessor">Assessor</option>
            </select>
          </label>
        )}
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowWelcome(true)}
        >
          Home
        </button>
        <Link href="/admin" className="btn ghost">
          {isAdmin ? "Admin platform" : "My deletion requests"}
        </Link>
        <Link href="/account" className="btn ghost">
          Account
        </Link>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void logout()}
        >
          Log out
        </button>
        {project && (
          <button
            className="btn ghost"
            onClick={() => {
              setProject(null);
              setShowReport(false);
              setShowQs(false);
              setSetup(false);
              setEditingDetails(false);
              setMessage("");
            }}
          >
            Projects
          </button>
        )}

        {isAdmin && <AssignProfessionals />}
      </div>
    </header>
  );
}
