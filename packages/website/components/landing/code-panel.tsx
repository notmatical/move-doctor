import { CodeBlock, type CodeLine } from "@/components/code/code-block";
import { Panel } from "@/components/landing/panel";

const LINES: CodeLine[] = [
  { no: 1, code: "module protocol::admin;" },
  { no: 2, code: "" },
  { no: 3, code: "public struct AdminCap has key { id: UID }" },
  { no: 4, code: "" },
  { no: 5, code: "fun init(ctx: &mut TxContext) {" },
  { no: 6, code: "    let admin = AdminCap { id: object::new(ctx) };" },
  { no: 7, code: "    transfer::public_share_object(admin);", tone: "remove" },
  { no: 7, code: "    transfer::transfer(admin, ctx.sender());", tone: "add" },
  { no: 8, code: "}" },
  { no: 9, code: "" },
  { no: 10, code: "public fun get_id(self: &AdminCap): ID {", tone: "flag" },
  { no: 10, code: "public fun id(self: &AdminCap): ID {", tone: "add" },
  { no: 11, code: "    self.id.to_inner()" },
  { no: 12, code: "}" },
  { no: 13, code: "" },
  { no: 14, code: "public fun delete(self: AdminCap) {" },
  { no: 15, code: "    let AdminCap { id } = self;" },
  { no: 16, code: "    id.delete();" },
  { no: 17, code: "}" },
];

export function CodePanel() {
  return (
    <Panel className="flex h-96 flex-col">
      <header className="flex items-center justify-between border-border/50 border-b px-5 py-3.5">
        <span className="font-mono text-muted-foreground text-xs">
          sources/admin.move
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-red-400 ring-1 ring-red-400/20 ring-inset">
            1 error
          </span>
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-400 ring-1 ring-amber-400/20 ring-inset">
            1 warning
          </span>
        </div>
      </header>

      {/* The module is longer than the card, so it overflows and fades out. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CodeBlock lines={LINES} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
        />
      </div>
    </Panel>
  );
}
