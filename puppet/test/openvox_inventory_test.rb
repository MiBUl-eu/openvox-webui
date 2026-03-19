# frozen_string_literal: true

require 'minitest/autorun'

module Facter
  module_function

  def add(_name)
    return unless block_given?

    shim = Object.new
    def shim.confine
      true
    end

    def shim.setcode
      true
    end

    shim.instance_eval(&Proc.new)
  end

  def warn(_message); end

  def debug(_message); end

  def value(_name)
    nil
  end
end

require_relative '../lib/facter/openvox_inventory'

class OpenVoxInventoryTest < Minitest::Test
  def test_normalize_packages_filters_invalid_and_deduplicates
    items = [
      { 'name' => 'httpd', 'version' => '2.4.62', 'release' => '1.el9', 'architecture' => 'x86_64' },
      { 'name' => 'httpd', 'version' => '2.4.62', 'release' => '1.el9', 'architecture' => 'x86_64' },
      { 'name' => 'curl', 'version' => '', 'release' => '1.el9' },
      { 'name' => '', 'version' => '1.0.0' }
    ]

    normalized = OpenVoxInventory.normalize_packages(items)

    assert_equal 1, normalized.length
    assert_equal 'httpd', normalized.first['name']
    assert_equal '2.4.62', normalized.first['version']
  end

  def test_normalize_applications_keeps_distinct_install_locations
    items = [
      { 'name' => 'MyApp', 'version' => '1.0.0', 'install_path' => '/opt/myapp' },
      { 'name' => 'MyApp', 'version' => '1.0.0', 'install_path' => '/Applications/MyApp.app' }
    ]

    normalized = OpenVoxInventory.normalize_applications(items)

    assert_equal 2, normalized.length
  end

  def test_infer_update_channel_uses_first_repository_source
    payload = {
      'packages' => [
        { 'name' => 'nginx', 'repository_source' => 'baseos' },
        { 'name' => 'curl', 'repository_source' => 'appstream' }
      ]
    }

    assert_equal 'baseos', OpenVoxInventory.infer_update_channel(payload)
  end

  def test_trim_respects_inventory_max_items
    items = (1..10).map { |index| { 'name' => "pkg#{index}", 'version' => '1.0.0' } }

    trimmed = OpenVoxInventory.trim(items, { 'inventory_max_items' => 3 })

    assert_equal 3, trimmed.length
    assert_equal 'pkg1', trimmed.first['name']
    assert_equal 'pkg3', trimmed.last['name']
  end
end
