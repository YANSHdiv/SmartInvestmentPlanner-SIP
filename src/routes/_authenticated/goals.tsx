import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { toUserMessage } from "@/lib/errors";

import { AppShell } from "@/components/layout/AppShell";
import { GoalCard } from "@/components/plan/pieces";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  analyseCurrentPlan,
  createGoal,
  deleteGoal,
  updateGoal,
} from "@/lib/api/finance.functions";
import { formatMoney } from "@/lib/format";
import type { GoalAnalysis } from "@/lib/planner/types";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Your goals — Smart Investment Planner" },
      {
        name: "description",
        content: "Track what you're saving towards, with progress and an estimated monthly amount.",
      },
      { property: "og:title", content: "Your goals — Smart Investment Planner" },
      {
        property: "og:description",
        content: "Add, edit and complete goals and see the monthly amount each one needs.",
      },
    ],
  }),
  component: GoalsPage,
});

const CATEGORIES = [
  { key: "emergency_fund", label: "Emergency fund" },
  { key: "laptop", label: "Laptop or device" },
  { key: "education", label: "Education" },
  { key: "travel", label: "Travel" },
  { key: "vehicle", label: "Vehicle" },
  { key: "house", label: "House" },
  { key: "retirement", label: "Retirement" },
  { key: "custom", label: "Something else" },
];

interface Draft {
  id?: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: number;
}

const emptyDraft: Draft = {
  name: "",
  category: "custom",
  target_amount: 0,
  current_amount: 0,
  target_date: "",
  priority: 2,
};

function GoalsPage() {
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: ["analysis"], queryFn: () => analyseCurrentPlan() });
  const [draft, setDraft] = useState<Draft | null>(null);

  const refresh = () => queryClient.invalidateQueries();

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const payload = {
        name: value.name.trim(),
        category: value.category,
        target_amount: value.target_amount,
        current_amount: value.current_amount,
        target_date: value.target_date || null,
        priority: value.priority,
      };
      if (value.id) await updateGoal({ data: { id: value.id, ...payload } });
      else await createGoal({ data: payload });
    },
    onSuccess: () => {
      toast.success("Goal saved.");
      setDraft(null);
      void refresh();
    },
    onError: (error) => toast.error(toUserMessage(error)),
  });

  const complete = useMutation({
    mutationFn: (id: string) => updateGoal({ data: { id, status: "completed" } }),
    onSuccess: () => {
      toast.success("Nice work — goal marked complete.");
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteGoal({ data: { id } }),
    onSuccess: () => {
      toast.success("Goal removed.");
      void refresh();
    },
  });

  if (planQuery.isLoading) {
    return (
      <AppShell title="Your goals">
        <LoadingState />
      </AppShell>
    );
  }
  if (planQuery.isError || !planQuery.data) {
    return (
      <AppShell title="Your goals">
        <ErrorState
          description={toUserMessage(planQuery.error)}
          onRetry={() => void planQuery.refetch()}
        />
      </AppShell>
    );
  }

  const { analysis } = planQuery.data;
  const currency = analysis.currency;

  function openEdit(goal: GoalAnalysis) {
    setDraft({
      ...(goal.id ? { id: goal.id } : {}),
      name: goal.name,
      category: goal.category,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate ?? "",
      priority: goal.priority,
    });
  }

  const invalid = !draft || !draft.name.trim() || draft.target_amount <= 0;

  return (
    <AppShell
      title="Your goals"
      subtitle="What you're saving towards, and what each one needs each month."
      actions={
        <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
          Add a goal
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Total needed each month across your goals: about{" "}
        <strong className="text-foreground">
          {formatMoney(analysis.goalsMonthlyRequirement, currency)}
        </strong>{" "}
        — a simple estimate that assumes no investment growth.
      </p>

      {analysis.goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="A goal can be anything with a price and a rough date — a laptop, a course, a deposit, or your emergency fund."
          action={<Button onClick={() => setDraft({ ...emptyDraft })}>Add your first goal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {analysis.goals.map((goal) => (
            <GoalCard
              key={goal.id ?? goal.name}
              goal={goal}
              currency={currency}
              actions={
                goal.id ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => complete.mutate(goal.id!)}>
                      Complete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(goal.id!)}>
                      Delete
                    </Button>
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogTrigger className="sr-only">Add a goal</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit goal" : "Add a goal"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="goal-name">Goal name</Label>
                <Input
                  id="goal-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Emergency fund"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-category">Type</Label>
                <Select
                  value={draft.category}
                  onValueChange={(category) => setDraft({ ...draft, category })}
                >
                  <SelectTrigger id="goal-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.key} value={category.key}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="goal-target">Amount needed</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    min={1}
                    value={draft.target_amount || ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        target_amount: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-current">Saved so far</Label>
                  <Input
                    id="goal-current"
                    type="number"
                    min={0}
                    value={draft.current_amount || ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        current_amount: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-date">Target date</Label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={draft.target_date}
                    onChange={(event) => setDraft({ ...draft, target_date: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-priority">How important is it?</Label>
                  <Select
                    value={String(draft.priority)}
                    onValueChange={(value) => setDraft({ ...draft, priority: Number(value) })}
                  >
                    <SelectTrigger id="goal-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Most important</SelectItem>
                      <SelectItem value="2">Important</SelectItem>
                      <SelectItem value="3">Nice to have</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {invalid ? (
                <p className="text-sm text-destructive">
                  Give the goal a name and an amount above zero.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => draft && save.mutate(draft)}
              disabled={invalid || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
