import { useState } from "react"

const getPadding = (indent: number): number => indent * 8

type JsonViewProps = {
  data: unknown
  keyName?: string
  indent?: number
  showComma?: boolean
}

export function JsonView({ data, keyName, indent = 0, showComma = false }: JsonViewProps) {
  const paddingLeft = getPadding(indent)

  if (data === null || data === undefined) {
    return <JsonNull keyName={keyName} paddingLeft={paddingLeft} showComma={showComma} />
  }

  if (typeof data === "string") {
    return <JsonString keyName={keyName} value={data} paddingLeft={paddingLeft} showComma={showComma} />
  }

  if (typeof data === "number") {
    return <JsonNumber keyName={keyName} value={data} paddingLeft={paddingLeft} showComma={showComma} />
  }

  if (typeof data === "boolean") {
    return <JsonBoolean keyName={keyName} value={data} paddingLeft={paddingLeft} showComma={showComma} />
  }

  if (data instanceof Date) {
    return <JsonDate keyName={keyName} value={data} paddingLeft={paddingLeft} showComma={showComma} />
  }

  if (Array.isArray(data)) {
    return <JsonArray arr={data} arrayKey={keyName} indent={indent} showComma={showComma} />
  }

  if (typeof data === "object") {
    return (
      <JsonObject obj={data as Record<string, unknown>} objectKey={keyName} indent={indent} showComma={showComma} />
    )
  }

  return (
    <span style={{ paddingLeft }}>
      <JsonKey keyName={keyName} />
      <span>{String(data)}</span>
      {showComma && <span className="text-(--color-json-bracket)">,</span>}
    </span>
  )
}

type JsonObjectProps = {
  obj: Record<string, unknown>
  objectKey?: string
  indent: number
  showComma?: boolean
}

const JsonObject = ({ obj, objectKey, indent, showComma = false }: JsonObjectProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const keys = Object.keys(obj)
  const paddingLeft = getPadding(indent)

  if (keys.length === 0) {
    return (
      <span style={{ paddingLeft }}>
        <JsonKey keyName={objectKey} />
        <span className="text-(--color-json-bracket)">{"{}"}</span>
        {showComma && <span className="text-(--color-json-bracket)">,</span>}
      </span>
    )
  }

  return (
    <div style={{ paddingLeft }}>
      <span
        className="cursor-pointer select-none rounded hover:bg-(--color-surface-alt)"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsCollapsed(!isCollapsed)
          }
        }}
      >
        <span className="text-(--color-json-bracket)">{isCollapsed ? "[+]" : "[-]"} </span>
        <JsonKey keyName={objectKey} />
        <span className="text-(--color-json-bracket)">{"{"}</span>
        {isCollapsed && <span className="text-(--color-json-null)"> ... </span>}
        {isCollapsed && <span className="text-(--color-json-bracket)">{"}"}</span>}
        {isCollapsed && showComma && <span className="text-(--color-json-bracket)">,</span>}
      </span>
      {!isCollapsed && (
        <>
          {keys.map((key, index) => (
            <div key={key}>
              <JsonView data={obj[key]} keyName={key} indent={indent + 0.5} showComma={index < keys.length - 1} />
            </div>
          ))}
          <div style={{ paddingLeft }}>
            <span className="text-(--color-json-bracket)">{"}"}</span>
            {showComma && <span className="text-(--color-json-bracket)">,</span>}
          </div>
        </>
      )}
    </div>
  )
}

type JsonArrayProps = {
  arr: unknown[]
  arrayKey?: string
  indent: number
  showComma?: boolean
}

const JsonArray = ({ arr, arrayKey, indent, showComma = false }: JsonArrayProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const paddingLeft = getPadding(indent)

  if (arr.length === 0) {
    return (
      <span style={{ paddingLeft }}>
        <JsonKey keyName={arrayKey} />
        <span className="text-(--color-json-bracket)">[ ]</span>
        {showComma && <span className="text-(--color-json-bracket)">,</span>}
      </span>
    )
  }

  return (
    <div style={{ paddingLeft }}>
      <span
        className="cursor-pointer select-none rounded hover:bg-(--color-surface-alt)"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsCollapsed(!isCollapsed)
          }
        }}
      >
        <span className="text-(--color-json-bracket)">{isCollapsed ? "[+]" : "[-]"} </span>
        <JsonKey keyName={arrayKey} />
        <span className="text-(--color-json-bracket)">{"["}</span>
        {isCollapsed && <span className="text-(--color-json-null)"> ... </span>}
        {isCollapsed && <span className="text-(--color-json-bracket)">{"]"}</span>}
        {isCollapsed && showComma && <span className="text-(--color-json-bracket)">,</span>}
      </span>
      {!isCollapsed && (
        <>
          <div>
            {arr.map((item, index) => (
              <div key={index}>
                <JsonView data={item} keyName={undefined} indent={indent + 1} showComma={index < arr.length - 1} />
              </div>
            ))}
          </div>
          <div style={{ paddingLeft }}>
            <span className="text-(--color-json-bracket)">{"]"}</span>
            {showComma && <span className="text-(--color-json-bracket)">,</span>}
          </div>
        </>
      )}
    </div>
  )
}

type JsonKeyProps = {
  keyName?: string
}

const JsonKey = ({ keyName }: JsonKeyProps) => {
  if (!keyName) {
    return null
  }
  return <span className="text-(--color-json-key)">{keyName}: </span>
}

type JsonValueProps = {
  keyName?: string
  paddingLeft: number
  showComma: boolean
}

const JsonNull = ({ keyName, paddingLeft, showComma }: JsonValueProps) => (
  <span style={{ paddingLeft }}>
    <JsonKey keyName={keyName} />
    <span className="text-(--color-json-null)">null</span>
    {showComma && <span className="text-(--color-json-bracket)">,</span>}
  </span>
)

const JsonString = ({ keyName, value, paddingLeft, showComma }: JsonValueProps & { value: string }) => (
  <span style={{ paddingLeft }}>
    <JsonKey keyName={keyName} />
    <span className="text-(--color-json-string)">"{value}"</span>
    {showComma && <span className="text-(--color-json-bracket)">,</span>}
  </span>
)

const JsonNumber = ({ keyName, value, paddingLeft, showComma }: JsonValueProps & { value: number }) => (
  <span style={{ paddingLeft }}>
    <JsonKey keyName={keyName} />
    <span className="text-(--color-json-number)">{value}</span>
    {showComma && <span className="text-(--color-json-bracket)">,</span>}
  </span>
)

const JsonBoolean = ({ keyName, value, paddingLeft, showComma }: JsonValueProps & { value: boolean }) => (
  <span style={{ paddingLeft }}>
    <JsonKey keyName={keyName} />
    <span className="text-(--color-json-boolean)">{value.toString()}</span>
    {showComma && <span className="text-(--color-json-bracket)">,</span>}
  </span>
)

const JsonDate = ({ keyName, value, paddingLeft, showComma }: JsonValueProps & { value: Date }) => (
  <span style={{ paddingLeft }}>
    <JsonKey keyName={keyName} />
    <span className="text-(--color-json-string)">{value.toLocaleString()}</span>
    {showComma && <span className="text-(--color-json-bracket)">,</span>}
  </span>
)
