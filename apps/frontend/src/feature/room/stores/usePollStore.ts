import { create } from 'zustand';
import type {
  EndPollDetailPayload,
  EndPollPayload,
  Poll,
  PollOption,
  PollPayload,
  UpdatePollStatusFullPayload,
  UpdatePollStatusSubPayload,
} from '@plum/shared-interfaces';

interface PollState {
  polls: Poll[];
  actions: {
    hydrateFromPolls: (polls: Poll[]) => void;
    setActivePoll: (poll: PollPayload) => void;
    updatePollOptions: (data: UpdatePollStatusSubPayload) => void;
    updatePollDetail: (data: UpdatePollStatusFullPayload) => void;
    setCompletedFromEnd: (data: EndPollPayload) => void;
    setCompletedFromEndDetail: (data: EndPollDetailPayload) => void;
  };
}

const ensureVoters = (options: PollOption[]) =>
  options.map((option) => ({
    ...option,
    voters: option.voters ?? [],
  }));

export const usePollStore = create<PollState>((set) => ({
  polls: [],
  actions: {
    hydrateFromPolls: (polls) => {
      set({
        polls: polls.map((poll) => ({
          ...poll,
          options: ensureVoters(poll.options),
        })),
      });
    },
    setActivePoll: (poll) => {
      set((state) => ({
        polls: state.polls.some((item) => item.id === poll.id)
          ? state.polls.map((item) =>
              item.id === poll.id
                ? {
                    ...item,
                    status: 'active',
                    title: poll.title,
                    options: ensureVoters(poll.options),
                    timeLimit: poll.timeLimit,
                    startedAt: poll.startedAt,
                    endedAt: poll.endedAt,
                  }
                : item,
            )
          : [
              ...state.polls,
              {
                id: poll.id,
                roomId: '',
                status: 'active',
                title: poll.title,
                options: ensureVoters(poll.options),
                timeLimit: poll.timeLimit,
                createdAt: '',
                updatedAt: '',
                startedAt: poll.startedAt,
                endedAt: poll.endedAt,
              },
            ],
      }));
    },
    updatePollOptions: (data) => {
      set((state) => {
        const poll = state.polls.find((item) => item.id === data.pollId);
        if (!poll) return state;

        return {
          polls: state.polls.map((item) => {
            if (item.id !== data.pollId) return item;

            const updatedOptions = item.options.map((option) => {
              const updated = data.options.find((entry) => entry.id === option.id);
              return updated ? { ...option, count: updated.count } : option;
            });

            return {
              ...item,
              options: updatedOptions,
            };
          }),
        };
      });
    },
    updatePollDetail: (data) => {
      set((state) => {
        const poll = state.polls.find((item) => item.id === data.pollId);
        if (!poll) return state;

        return {
          polls: state.polls.map((item) => {
            if (item.id !== data.pollId) return item;

            const updatedOptions = item.options.map((option) => {
              const updated = data.options.find((entry) => entry.id === option.id);
              if (!updated) return option;

              if (option.id !== data.voter.optionId) {
                return { ...option, count: updated.count };
              }

              const voters = option.voters ?? [];
              const alreadyVoted = voters.some((voter) => voter.id === data.voter.participantId);

              return {
                ...option,
                count: updated.count,
                voters: alreadyVoted
                  ? voters
                  : [...voters, { id: data.voter.participantId, name: data.voter.name }],
              };
            });

            return {
              ...item,
              options: updatedOptions,
            };
          }),
        };
      });
    },
    setCompletedFromEnd: (data) => {
      set((state) => {
        return {
          polls: state.polls.map((item) =>
            item.id === data.pollId
              ? {
                  ...item,
                  status: 'ended',
                  options: ensureVoters(data.options.map((option) => ({ ...option, voters: [] }))),
                }
              : item,
          ),
        };
      });
    },
    setCompletedFromEndDetail: (data) => {
      set((state) => {
        return {
          polls: state.polls.map((item) =>
            item.id === data.pollId
              ? {
                  ...item,
                  status: 'ended',
                  options: ensureVoters(data.options),
                }
              : item,
          ),
        };
      });
    },
  },
}));
