#!/usr/bin/env ruby
require 'nokogiri' 

module ExtractTg
  class Arguments;
    def initialize(); self.files = []; end
    attr_accessor :files, :output_path, :css; end

  HELP = <<EOHELP
ExtractTg is a naive utility extracting text from (mostly) Telegram HTML
Arguments: [file+] [-o output] [-c css selector] | [(-/--)?help]/[-h]
EOHELP
  def self.parse_args(argv)
    check_given = ->(wtf, o) { raise ArgumentError, "#{wtf} is given as #{o}" unless o.nil? }
    raise ArgumentError, 'At least give me a file' if argv.size < 1
    s0, ex_opath, ex_fs, ex_css = (0...100).to_a; state = s0
    args = Arguments.new
    for arg in argv
      case state
      when s0
        case arg
          when '-o' then state = ex_opath
          when '-c' then state = ex_css
          when 'help', '--help', '-help', '-h' then puts(HELP); break
          else state = ex_fs; redo # does not consume paths
        end
      when ex_opath
        check_given.call('Output path', args.output_path)
        args.output_path = arg
        state = s0
      when ex_fs
        if arg.start_with?('-') then state = s0; redo; end
        raise ArgumentError, "File #{arg} not exists" unless File.exist?(arg)
        args.files.push(arg)
      when ex_css
        check_given.call('CSS Selector', args.css)
        args.css = arg
        state = s0
      end
    end
    raise ArgumentError, 'Unterminated arguments' if state != s0
    return args
  end

  @OUT = STDOUT
  def self.main(argv = ARGV)
    args = parse_args(argv)
    if args.files.size == 0; exit; end
    args.css ||= 'body .text'
    warn "Extracting #{args.files.join(', ')} into #{args.output_path or 'stdout'}…"
    @OUT = File.open(args.output_path, 'w') unless args.output_path.nil?
    args.files.each { |f| warn "#{f}: #{extract(f, args.css)} bytes written." }
  end

  def self.extract(path, cs)
    hf = File.read(path)
    hs = Nokogiri.parse(hf)
    wrote = 0
    for elem in hs.css(cs)
      text = elem.text
      wrote += @OUT.write(text)
    end
    @OUT.flush
    return wrote
  end
end

ExtractTg.main if __FILE__ == $0
