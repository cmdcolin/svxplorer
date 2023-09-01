import { useEffect, useState } from 'react'
import VCF from '@gmod/vcf'
import './App.css'

const files = [
  'benchmark/HG002_SVs_Tier1_v0.6.bed',
  'benchmark/HG002_SVs_Tier1_v0.6._hi_conf.bed',
  'benchmark/HG002_SVs_Tier1_v0.6._hi_conf_short_read_only.bed',
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
            id="raw"
            name="mode"
            value="raw"
            checked={mode === 'raw'}
            onChange={event => setMode(event.target.value)}
          />
          <label htmlFor="raw">Raw VCF</label>
        </div>

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
      </fieldset>

      <Table key={value} mode={mode} filename={value} />
    </>
  )
}

function Table({ mode, filename }: { mode: string; filename: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>()
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
        const data = await response.text()
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
          setData(lines)
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
                  INFO: { END: ret[2] },
                },
                line: line.split('\t'),
              }
            })
          setData(lines)
        }
      } catch (e) {
        setError(e)
        console.error(e)
      }
    })()
  }, [filename])
  const rows = data
  return error ? (
    <div style={{ color: 'red' }}>{`${error}`}</div>
  ) : (
    <>
      {mode === 'raw' ? (
        <RawVCF key={filename} rows={rows} />
      ) : (
        <ParsedVCF key={filename} rows={rows} />
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
}: {
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
      <div>Rows:{rows.length}</div>
      <table>
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
          {rows.slice(0, 100).map(({ parsed, line }) => {
            const start = parsed.POS || 0
            const end = +(parsed.END || parsed.INFO?.END?.[0] || 0)
            const len = (end - start).toLocaleString('en-US')
            const s = start.toLocaleString('en-US')
            const e = start.toLocaleString('en-US')
            return (
              <tr key={line.join('\t')}>
                <td>
                  <a
                    href={`https://jbrowse.org/code/jb2/v2.6.3/?config=/demos/hg002_demo/config.json&assembly=hg19&loc=${line[0]}:${start}-${end}`}
                    target="_blank"
                  >
                    {`${line[0]}:${s}-${e}`}
                  </a>
                </td>
                <td>{len}</td>
                <td>{parsed.ID}</td>
                <td>{shorten(parsed.REF)}</td>
                <td>{shorten(parsed.ALT)}</td>
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
