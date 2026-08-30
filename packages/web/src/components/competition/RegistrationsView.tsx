import { useState } from "react";
import RegistrationsTable from "./RegistrationsTable";
import RegisterExistingModal from "./RegisterExistingModal";
import InlineRegisterModal from "./InlineRegisterModal";
import BulkRegisterModal from "./BulkRegisterModal";

export default function RegistrationsView() {
  const [regOpen, setRegOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <div>
      <RegistrationsTable
        onOpenRegister={() => setRegOpen(true)}
        onOpenInline={() => setInlineOpen(true)}
        onOpenBulk={() => setBulkOpen(true)}
      />
      <RegisterExistingModal open={regOpen} onClose={() => setRegOpen(false)} />
      <InlineRegisterModal open={inlineOpen} onClose={() => setInlineOpen(false)} />
      <BulkRegisterModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
