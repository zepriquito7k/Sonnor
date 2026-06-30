import ExpoModulesCore
import MediaPlayer

public class SonnorRemoteControlsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SonnorRemoteControls")

    Events("onRemoteNext", "onRemotePrevious")

    Function("configure") {
      let commandCenter = MPRemoteCommandCenter.shared()

      commandCenter.nextTrackCommand.isEnabled = true
      commandCenter.previousTrackCommand.isEnabled = true

      commandCenter.nextTrackCommand.removeTarget(nil)
      commandCenter.previousTrackCommand.removeTarget(nil)

      commandCenter.nextTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onRemoteNext")
        return .success
      }

      commandCenter.previousTrackCommand.addTarget { [weak self] _ in
        self?.sendEvent("onRemotePrevious")
        return .success
      }

      return true
    }
  }
}
