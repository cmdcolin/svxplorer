import { useEffect, useState } from 'react'
import { ungzip } from 'pako'
import VCF from '@gmod/vcf'
import './App.css'

const files = [
  'benchmark/HG002_SVs_Tier1_v0.6.vcf.gz',
  'calls/HG002.2X250.downsampled.50X.breakseq.vcf',
  'calls/HG002.2X250.downsampled.50X.cnvnator.svtyped.vcf',
  'calls/HG002.2X250.downsampled.50X.cnvnator.vcf',
  'calls/HG002.2X250.downsampled.50X.combined.genotyped.vcf',
  'calls/HG002.2X250.downsampled.50X.delly.deletion.vcf',
  'calls/HG002.2X250.downsampled.50X.delly.duplication.vcf',
  'calls/HG002.2X250.downsampled.50X.delly.insertion.vcf',
  'calls/HG002.2X250.downsampled.50X.delly.svtyped.vcf',
  'calls/HG002.2X250.downsampled.50X.lumpy.svtyped.vcf',
  'calls/HG002.2X250.downsampled.50X.lumpy.vcf',
  'calls/HG002.2X250.downsampled.50X.manta.svtyped.vcf',
  'calls/HG002.2X250.downsampled.50X.breakdancer.svtyped.vcf',
  'calls/HG002.2X250.downsampled.50X.breakdancer.vcf',
  'calls/HG002.2X250.downsampled.50X.breakseq.svtyped.vcf',
]
function App() {
  const [value, setValue] = useState(files[0])
  const [mode, setMode] = useState('parsed')
  const [filter, setFilter] = useState('CHR:22')
  return (
    <>
      <h1>Team 7: Mapping vs assembly based SV calls</h1>
      <label htmlFor="file_box">Select a file to browse</label>
      <select
        id="file_box"
        value={value}
        onChange={event => setValue(event.target.value)}
      >
        {files.map(f => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <fieldset>
        <div>
          <input
            type="radio"
            id="parsed"
            name="mode"
            value="parsed"
            checked={mode === 'parsed'}
            onChange={event => setMode(event.target.value)}
          />
          <label htmlFor="parsed">Parsed VCF</label>
        </div>
        <label htmlFor="filter">
          Filter (example, type CHR:22 for chromosome 22 variants, this demo is
          currently best done looking at chr22):{' '}
        </label>{' '}
        <input
          type="text"
          id="filter"
          value={filter}
          onChange={event => setFilter(event.target.value)}
        />
      </fieldset>

      <Table key={value} filter={filter} mode={mode} filename={value} />
    </>
  )
}

function isGzip(buf: Uint8Array) {
  return buf[0] === 31 && buf[1] === 139 && buf[2] === 8
}

function Table({
  mode,
  filter,
  filename,
}: {
  filter: string
  mode: string
  filename: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>()
  const [error, setError] = useState<unknown>()
  useEffect(() => {
    // eslint-disable-next-line no-extra-semi
    ;(async () => {
      try {
        const response = await fetch(filename)
        if (!response.ok) {
          throw new Error(
            `HTTP ${
              response.status
            } fetching ${filename} ${await response.text()}`,
          )
        }
        const buf = await response.arrayBuffer()
        let view = new Uint8Array(buf)
        if (isGzip(view)) {
          view = ungzip(view)
        }
        const data = new TextDecoder('utf8', { fatal: true }).decode(view)

        if (filename.endsWith('.vcf') || filename.endsWith('.vcf.gz')) {
          const parser = new VCF({
            header: data
              .split('\n')
              .filter(f => f.startsWith('#'))
              .join('\n'),
          })
          const lines = data
            .split('\n')
            .filter(f => !f.startsWith('#'))
            .filter(f => !!f)
            .map(line => ({
              parsed: parser.parseLine(line),
              line: line.split('\t'),
            }))
          setRows(lines)
        } else if (filename.endsWith('.bed')) {
          const lines = data
            .split('\n')
            .filter(f => !f.startsWith('#'))
            .filter(f => !!f)
            .map(line => {
              const ret = line.split('\t')
              return {
                parsed: {
                  CHROM: ret[0],
                  POS: +ret[1],
                  ID: ret[3],
                  INFO: {
                    END: [ret[2]],
                    SVTYPE: ret[1] === ret[2] + 1 ? 'INS' : '',
                  },
                },
                line: line.split('\t'),
              }
            })
          setRows(lines)
        }
      } catch (e) {
        setError(e)
        console.error(e)
      }
    })()
  }, [filename])
  return error ? (
    <div style={{ color: 'red' }}>{`${error}`}</div>
  ) : !rows ? (
    <h1>Loading...</h1>
  ) : (
    <>
      {mode === 'raw' ? (
        <RawVCF key={filename} rows={rows} />
      ) : (
        <ParsedVCF
          filter={filter}
          filename={filename}
          key={filename}
          rows={rows}
        />
      )}
    </>
  )
}

function RawVCF({ rows }: { rows?: { line: string[]; parsed: any }[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>CHROM</th>
          <th>START</th>
          <th>ID</th>
          <th>REF</th>
          <th>ALT</th>
          <th>QUAL</th>
          <th>FILTER</th>
          <th>INFO</th>
        </tr>
      </thead>
      <tbody>
        {rows?.map(({ line }) => (
          <tr key={line.join('\t')}>
            <td>{line[0]}</td>
            <td>{(+line[1]).toLocaleString('en-US')}</td>
            <td>{line[2]}</td>
            <td>{line[3]}</td>
            <td>{line[4]}</td>
            <td>{line[5]}</td>
            <td>{line[6]}</td>
            <td>{line[7]}</td>
            <td>Hello</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function shorten(v = '', len = 30) {
  const val = `${v}`
  return val.length > len ? val.slice(0, len) + '...' : val
}

function ParsedVCF({
  rows = [],
  filename,
  filter,
}: {
  filename: string
  filter: string
  rows?: { line: string[]; parsed: any }[]
}) {
  const keys = new Set<string>()
  for (const row of rows.slice(0, 100)) {
    for (const k of Object.keys(row.parsed.INFO)) {
      keys.add(k)
    }
  }
  keys.delete('END')

  return (
    <>
      <table>
        <caption>
          Displaying {filename}. Rows: {rows.length}
        </caption>
        <thead>
          <tr>
            <th>JB2 LINK</th>
            <th>LENGTH</th>
            <th>ID</th>
            <th>REF</th>
            <th>ALT</th>
            <th>QUAL</th>
            <th>FILTER</th>
            {[...keys].map(k => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter(f => {
              if (filter.startsWith('CHR:')) {
                return f.parsed.CHROM == filter.slice(4)
              } else {
                return f.line.join('\t').includes(filter)
              }
            })
            .slice(0, 1000)
            .map(({ parsed, line }) => {
              const CHROM = parsed.CHROM
              const start = +parsed.POS || 0
              const end = +parsed.INFO?.END?.[0]
              const len = end - start
              const l = len.toLocaleString('en-US')
              const s = start.toLocaleString('en-US')
              const e = end.toLocaleString('en-US')
              const left = Math.floor(start - len / 3)
              const right = Math.floor(end + len / 3)
              return (
                <tr key={line.join('\t')}>
                  <td>
                    <a
                      href={`https://jbrowse.org/code/jb2/v2.6.3/?config=/demos/hg002_demo/config.json&assembly=hg19&loc=${line[0]}:${left}-${right}&tracks=2x250_hg19,chr22_MATERNAL_vs_hg19_cigar,chr22_PATERNAL_vs_hg19_cigar,HG002_SVs_Tier1_v0.6.vcf`}
                      target="_blank"
                    >
                      {`${CHROM}:${s}-${e}`}
                    </a>
                  </td>
                  <td>{l}</td>
                  <td>{parsed.ID}</td>
                  <td>{shorten(parsed.REF, 10)}</td>
                  <td>{shorten(parsed.ALT, 10)}</td>
                  <td>{shorten(parsed.QUAL)}</td>
                  <td>{shorten(parsed.FILTER)}</td>
                  {[...keys].map((k, idx) => {
                    const val = shorten(parsed.INFO[k] || '')
                    return <td key={val + '-' + idx}>{val}</td>
                  })}
                </tr>
              )
            })}
        </tbody>
      </table>
    </>
  )
}

export default App
