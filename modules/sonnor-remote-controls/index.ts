import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";

type RemoteControlEvents = {
  onRemoteNext: () => void;
  onRemotePrevious: () => void;
};

type SonnorRemoteControlsModule = {
  addListener<EventName extends keyof RemoteControlEvents>(
    eventName: EventName,
    listener: RemoteControlEvents[EventName],
  ): EventSubscription;
  configure(): boolean;
};

const nativeModule =
  requireOptionalNativeModule<SonnorRemoteControlsModule>(
    "SonnorRemoteControls",
  );

export function configureRemoteControls() {
  return nativeModule?.configure() ?? false;
}

export function addRemoteControlListener<EventName extends keyof RemoteControlEvents>(
  eventName: EventName,
  listener: RemoteControlEvents[EventName],
): EventSubscription {
  return nativeModule?.addListener(eventName, listener) ?? { remove() {} };
}
