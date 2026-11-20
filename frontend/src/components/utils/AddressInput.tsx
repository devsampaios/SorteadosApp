import { useState } from "react";
import TextInput from "./TextInput";
import SelectInput from "./SelectInput";
import IntegerInput from "./IntegerInput";

type AddressValues = {
  addressZip?: string;
  address?: string;
  addressNumber?: string | number;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
  addressComplement?: string;
};

type Errors = Partial<Record<keyof AddressValues, string>>;
type Touched = Partial<Record<keyof AddressValues, boolean>>;

type FormikHelpers = {
  setFieldValue: (field: string, value: unknown) => void;
  /** Marca o campo como "tocado" — recebe o nome do campo, não o evento */
  setFieldTouched?: (field: string) => void;
};

type AddressInputProps = {
  values: AddressValues;
  errors?: Errors;
  touched?: Touched;
  disabled?: boolean;
  loading?: boolean;
  helpers: FormikHelpers;
};

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
].map((uf) => ({ value: uf, label: uf }));

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

export default function AddressInput({
  values,
  errors = {},
  touched = {},
  disabled,
  loading,
  helpers,
}: AddressInputProps) {
  const [fetchingCep, setFetchingCep] = useState(false);
  const [cepError, setCepError] = useState("");

  const fetchCep = async () => {
    const clean = (values.addressZip ?? "").replace(/\D/g, "");
    if (clean.length !== 8) { setCepError("CEP inválido"); return; }
    setCepError("");
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        helpers.setFieldValue("addressZip", maskCep(clean));
        helpers.setFieldValue("address", data.logradouro ?? "");
        helpers.setFieldValue("addressDistrict", data.bairro ?? "");
        helpers.setFieldValue("addressCity", data.localidade ?? "");
        helpers.setFieldValue("addressState", data.uf ?? "");
      }
    } catch {
      setCepError("Erro ao buscar CEP");
    } finally {
      setFetchingCep(false);
    }
  };

  const isDisabled = disabled || loading;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 16px" }}>
      <div style={{ gridColumn: "span 2" }}>
        <TextInput
          label="CEP"
          name="addressZip"
          value={maskCep(values.addressZip ?? "")}
          onChange={(valor) => helpers.setFieldValue("addressZip", maskCep(valor))}
          onBlur={() => helpers.setFieldTouched?.("addressZip")}
          placeholder="00000-000"
          disabled={isDisabled}
          error={touched.addressZip ? errors.addressZip : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn--secundario btn--sm"
          onClick={fetchCep}
          disabled={isDisabled || fetchingCep}
          style={{ height: 42 }}
        >
          {fetchingCep ? "Buscando..." : "Buscar CEP"}
        </button>
        {cepError && <span className="u-field__error" style={{ marginTop: 4 }}>{cepError}</span>}
      </div>

      <div style={{ gridColumn: "span 3" }}>
        <TextInput
          label="Logradouro"
          name="address"
          value={values.address ?? ""}
          onChange={(valor) => helpers.setFieldValue("address", valor)}
          onBlur={() => helpers.setFieldTouched?.("address")}
          disabled={isDisabled}
          error={touched.address ? errors.address : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 1" }}>
        <IntegerInput
          label="Número"
          name="addressNumber"
          value={values.addressNumber != null ? String(values.addressNumber) : ""}
          onChange={(valor) => helpers.setFieldValue("addressNumber", valor ? Number(valor) : "")}
          onBlur={() => helpers.setFieldTouched?.("addressNumber")}
          disabled={isDisabled}
          error={touched.addressNumber ? errors.addressNumber : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 2" }}>
        <TextInput
          label="Bairro"
          name="addressDistrict"
          value={values.addressDistrict ?? ""}
          onChange={(valor) => helpers.setFieldValue("addressDistrict", valor)}
          onBlur={() => helpers.setFieldTouched?.("addressDistrict")}
          disabled={isDisabled}
          error={touched.addressDistrict ? errors.addressDistrict : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 2" }}>
        <TextInput
          label="Cidade"
          name="addressCity"
          value={values.addressCity ?? ""}
          onChange={(valor) => helpers.setFieldValue("addressCity", valor)}
          onBlur={() => helpers.setFieldTouched?.("addressCity")}
          disabled={isDisabled}
          error={touched.addressCity ? errors.addressCity : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 1" }}>
        <SelectInput
          label="UF"
          name="addressState"
          value={values.addressState ?? ""}
          onChange={(valor) => helpers.setFieldValue("addressState", valor)}
          onBlur={() => helpers.setFieldTouched?.("addressState")}
          options={[{ value: "", label: "UF" }, ...UF_OPTIONS]}
          disabled={isDisabled}
          required
          error={touched.addressState ? errors.addressState : undefined}
        />
      </div>

      <div style={{ gridColumn: "span 3" }}>
        <TextInput
          label="Complemento"
          name="addressComplement"
          value={values.addressComplement ?? ""}
          onChange={(valor) => helpers.setFieldValue("addressComplement", valor)}
          onBlur={() => helpers.setFieldTouched?.("addressComplement")}
          disabled={isDisabled}
          error={touched.addressComplement ? errors.addressComplement : undefined}
        />
      </div>
    </div>
  );
}
