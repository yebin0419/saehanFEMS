const SAMPLE_JSON = `{
  "meta": { "factory": "A공장", "from": "2026-10-27T07:00", "to": "2026-10-28T07:00" },
  "equipments": [
    {
      "id": "EQ-001",
      "name": "사출기 1호",
      "samples": [
        { "t": "2026-10-27T07:00", "a": 12.4 },
        { "t": "2026-10-27T07:01", "a": 0.0 }
      ]
    }
  ]
}`;

const BOOKMARKLET =
  "javascript:(function(){ /* TODO: 사내 EMS 환경에 맞춰 북마크 스크립트 삽입 */ alert('즐겨찾기 스크립트 자리입니다.'); })();";

export function HelpBox() {
  return (
    <div className="space-y-3">
      <details className="bg-amber-50 border border-amber-200 rounded-card p-3">
        <summary className="font-semibold cursor-pointer">
          EMS JSON 데이터 추출 방법 (즐겨찾기 스크립트)
        </summary>
        <div className="mt-2 text-[13px]">
          <p>
            사내 EMS 시스템 화면에서 아래 즐겨찾기(북마크릿)를 실행하면, 분석 기간
            (07:00 ~ 익일 07:00) 전류 데이터가 JSON으로 자동 저장됩니다. 아래{" "}
            <strong>3단계</strong>를 따라주세요.
          </p>
          <h4 className="mt-3.5 mb-1.5 text-[13px] font-semibold">
            1. 즐겨찾기(북마크) 생성
          </h4>
          <ul className="m-0 pl-5 list-disc">
            <li>
              사용 중인 웹 브라우저(Chrome, Edge 등)에서{" "}
              <strong>새 북마크/즐겨찾기</strong>를 생성합니다.
            </li>
            <li>
              URL 입력 칸에 <strong>웹 주소 대신</strong> 아래 상자의 JavaScript
              코드를 복사해 붙여넣고 저장합니다.
            </li>
          </ul>
          <h4 className="mt-3.5 mb-1.5 text-[13px] font-semibold">
            2. EMS 웹페이지 접속 및 스크립트 실행
          </h4>
          <ul className="m-0 pl-5 list-disc">
            <li>데이터 추출 대상인 사내 EMS 조회 화면에 접속합니다.</li>
            <li>
              조회 기준 시간(<strong>07:00 ~ 익일 07:00</strong>)을 확인한 뒤,
              즐겨찾기를 클릭합니다.
            </li>
            <li>JSON 파일이 자동으로 다운로드됩니다.</li>
          </ul>
          <h4 className="mt-3.5 mb-1.5 text-[13px] font-semibold">
            3. 분석 페이지에 업로드
          </h4>
          <ul className="m-0 pl-5 list-disc">
            <li>
              다운로드된 JSON 파일을 위의 <strong>파일 업로드 영역</strong>에
              드래그 앤 드롭하거나 선택하여 업로드합니다.
            </li>
          </ul>
          <h4 className="mt-3.5 mb-1.5 text-[13px] font-semibold">
            즐겨찾기 스크립트 코드
          </h4>
          <pre className="bg-slate-800 text-slate-200 p-3 rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
            {BOOKMARKLET}
          </pre>
        </div>
      </details>

      <details className="bg-amber-50 border border-amber-200 rounded-card p-3">
        <summary className="font-semibold cursor-pointer">샘플 JSON 포맷</summary>
        <pre className="bg-slate-800 text-slate-200 p-3 mt-2 rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
          {SAMPLE_JSON}
        </pre>
      </details>
    </div>
  );
}
