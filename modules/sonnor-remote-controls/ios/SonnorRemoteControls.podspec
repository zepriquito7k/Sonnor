require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'SonnorRemoteControls'
  s.version          = package['version']
  s.summary          = 'Lock screen next and previous controls for Sonnor.'
  s.description      = 'Small Expo module that forwards iOS lock screen next and previous commands to JavaScript.'
  s.license          = 'MIT'
  s.author           = 'Sonnor'
  s.homepage         = 'https://github.com/zepriquito7k/Sonnor'
  s.platforms        = { :ios => '15.1' }
  s.source           = { :git => 'https://github.com/zepriquito7k/Sonnor.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift}"
end
