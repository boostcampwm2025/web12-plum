import { MediaType } from '@plum/shared-interfaces';

export type ProducerAppData = {
  ownerId: string;
  source: MediaType;
};

export type ConsumerAppData = {
  ownerId: string;
  receiverId: string;
};
