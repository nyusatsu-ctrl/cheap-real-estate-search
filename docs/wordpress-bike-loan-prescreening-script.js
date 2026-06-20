(function () {
  "use strict";

  var PRE_SCREENING_PASS_REDIRECT_URL = "";
  var PRE_SCREENING_FORM_SELECTOR = "#ecoloop-prescreening-application-form";
  var PRE_SCREENING_RESULT_PARAM = "pre_screening_passed";
  var eligiblePrefectures = [
    "\u798f\u5ca1\u770c", "\u4f50\u8cc0\u770c", "\u9577\u5d0e\u770c", "\u718a\u672c\u770c", "\u5927\u5206\u770c", "\u5bae\u5d0e\u770c", "\u9e7f\u5150\u5cf6\u770c", "\u6c96\u7e04\u770c",
    "\u5fb3\u5cf6\u770c", "\u9999\u5ddd\u770c", "\u611b\u5a9b\u770c", "\u9ad8\u77e5\u770c",
    "\u9ce5\u53d6\u770c", "\u5cf6\u6839\u770c", "\u5ca1\u5c71\u770c"
  ];

  function getRoot() {
    return document.getElementById("ecoloop-prescreening-root");
  }

  function getModal() {
    return document.getElementById("ecoloop-prescreening-modal");
  }

  function getForm() {
    return document.getElementById("ecoloop-prescreening-form");
  }

  function getFormView() {
    return document.getElementById("ecoloop-prescreening-form-view");
  }

  function getResultView() {
    return document.getElementById("ecoloop-prescreening-result-view");
  }

  function getValidationMessage() {
    return document.getElementById("ecoloop-prescreening-validation-message");
  }

  function getRadioValue(name) {
    var form = getForm();
    if (!form) return "";
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function setHiddenElement(element, isHidden, visibleDisplay) {
    if (!element) return;
    element.hidden = isHidden;
    element.style.display = isHidden ? "none" : visibleDisplay;
    element.setAttribute("aria-hidden", isHidden ? "true" : "false");
  }

  function stopHandledEvent(event) {
    if (!event) return;
    if (typeof event.preventDefault === "function") event.preventDefault();
    if (typeof event.stopPropagation === "function") event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function openModal() {
    var modal = getModal();
    if (!modal) return;
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    var firstInput = modal.querySelector("select, input, button");
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    var modal = getModal();
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  function isEligibleArea(prefecture) {
    return eligiblePrefectures.indexOf(prefecture) !== -1;
  }

  function evaluatePreScreening(data) {
    var reasons = [];
    var eligibleArea = isEligibleArea(data.prefecture);
    if (!eligibleArea) reasons.push("OUTSIDE_SERVICE_AREA");
    if (data.unpaidDelinquency === "yes") reasons.push("CURRENT_UNPAID_DELINQUENCY");
    return {
      ok: reasons.length === 0,
      reasons: reasons
    };
  }

  function setValidationMessage(message) {
    var validationMessage = getValidationMessage();
    if (validationMessage) validationMessage.textContent = message || "";
  }

  function validateForm() {
    var form = getForm();
    if (!form) return false;
    setValidationMessage("");
    if (!form.reportValidity()) {
      setValidationMessage("\u672a\u5165\u529b\u306e\u9805\u76ee\u304c\u3042\u308a\u307e\u3059\u3002\u3059\u3079\u3066\u56de\u7b54\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
      return false;
    }
    return true;
  }

  function getApplicationFormElement() {
    return document.querySelector(PRE_SCREENING_FORM_SELECTOR);
  }

  function setApplicationFormVisible(isVisible) {
    var applicationForm = getApplicationFormElement();
    if (!applicationForm) return null;
    applicationForm.hidden = !isVisible;
    applicationForm.style.display = isVisible ? "block" : "none";
    applicationForm.setAttribute("aria-hidden", isVisible ? "false" : "true");
    return applicationForm;
  }

  function hideApplicationForm() {
    return setApplicationFormVisible(false);
  }

  function showApplicationForm() {
    return setApplicationFormVisible(true);
  }

  function goToApplicationForm() {
    var url = PRE_SCREENING_PASS_REDIRECT_URL;
    if (url) {
      var nextUrl = new URL(url, window.location.href);
      nextUrl.searchParams.set(PRE_SCREENING_RESULT_PARAM, "1");
      window.location.href = nextUrl.toString();
      return;
    }
    var applicationForm = showApplicationForm();
    if (applicationForm) {
      closeModal();
      applicationForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    closeModal();
    alert("\u4eee\u5be9\u67fb\u30d5\u30a9\u30fc\u30e0\u8868\u793a\u30a8\u30ea\u30a2\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002\u56fa\u5b9a\u30da\u30fc\u30b8\u5074\u306e #ecoloop-prescreening-application-form \u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }

  function showNgResult(result) {
    var formView = getFormView();
    var resultView = getResultView();
    var reasons = result && result.reasons ? result.reasons : [];
    var message = reasons.indexOf("OUTSIDE_SERVICE_AREA") !== -1
      ? "\u73fe\u5728\u304a\u4f4f\u307e\u3044\u306e\u5730\u57df\u306f\u3001\u5f53\u793e\u30d0\u30a4\u30af\u81ea\u793e\u30ed\u30fc\u30f3\u306e\u7533\u8fbc\u5bfe\u8c61\u5730\u57df\u5916\u306e\u305f\u3081\u3001\u4eee\u5be9\u67fb\u30d5\u30a9\u30fc\u30e0\u3078\u9032\u3081\u307e\u305b\u3093\u3002\u7533\u8fbc\u5bfe\u8c61\u5730\u57df\u306f\u3001\u4e5d\u5dde\u5168\u57df\u3001\u9ce5\u53d6\u770c\u30fb\u5cf6\u6839\u770c\u30fb\u5ca1\u5c71\u770c\u3001\u56db\u56fd\u5168\u57df\u3067\u3059\u3002"
      : "\u3054\u5165\u529b\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u305f\u7d50\u679c\u3001\u73fe\u5728\u306e\u6761\u4ef6\u3067\u306f\u4eee\u5be9\u67fb\u3078\u306e\u304a\u7533\u3057\u8fbc\u307f\u304c\u96e3\u3057\u3044\u72b6\u6cc1\u3067\u3059\u3002\u652f\u6255\u3044\u72b6\u6cc1\u304c\u6539\u5584\u3055\u308c\u305f\u5f8c\u306b\u3001\u518d\u5ea6\u3054\u76f8\u8ac7\u304f\u3060\u3055\u3044\u3002";
    setHiddenElement(formView, true, "block");
    setHiddenElement(resultView, false, "block");
    hideApplicationForm();
    if (!resultView) return;
    resultView.style.border = "1px solid #fecaca";
    resultView.style.background = "#fef2f2";
    resultView.innerHTML =
      '<h2 style="box-sizing:border-box;margin:0;font-size:24px;line-height:1.35;color:#111827;font-weight:700;">\u73fe\u5728\u306e\u5185\u5bb9\u3067\u306f\u4eee\u5be9\u67fb\u306b\u9032\u3081\u307e\u305b\u3093</h2>' +
      '<p style="box-sizing:border-box;margin:8px 0 0;font-size:16px;line-height:1.8;color:#1f2937;">' + message + '</p>' +
      '<div style="box-sizing:border-box;display:flex;justify-content:flex-end;margin-top:16px;">' +
      '<button type="button" onclick="return window.ecoloopPrescreeningClose(event)" style="box-sizing:border-box;appearance:none;border:0;border-radius:8px;background:#dc2626;color:#ffffff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;white-space:nowrap;">\u9589\u3058\u308b</button>' +
      '</div>';
  }

  function renderResult(result) {
    var form = getForm();
    if (!form) return;
    if (form.elements.prescreening_result_code) form.elements.prescreening_result_code.value = result.ok ? "OK" : "NG";
    if (form.elements.prescreening_reason_codes) form.elements.prescreening_reason_codes.value = result.reasons.join(",");
    if (result.ok) {
      goToApplicationForm();
      return;
    }
    showNgResult(result);
  }

  function resetResultView() {
    var formView = getFormView();
    var resultView = getResultView();
    setHiddenElement(formView, false, "block");
    setHiddenElement(resultView, true, "block");
    if (resultView) {
      resultView.innerHTML = "";
      resultView.style.border = "";
      resultView.style.background = "";
    }
    hideApplicationForm();
  }

  function applyInitialApplicationFormState() {
    var modal = getModal();
    if (modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
    var params = new URLSearchParams(window.location.search);
    if (params.get(PRE_SCREENING_RESULT_PARAM) === "1") {
      showApplicationForm();
      return;
    }
    hideApplicationForm();
  }

  function attachEventListeners() {
    var root = getRoot();
    var modal = getModal();
    var form = getForm();
    if (!root || !modal || !form) return;

    root.querySelectorAll("[data-ecoloop-prescreening-open]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.ecoloopPrescreeningOpen();
      });
    });

    modal.querySelectorAll("[data-ecoloop-prescreening-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.ecoloopPrescreeningClose();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal && modal.style.display === "block") {
        closeModal();
      }
    });

    form.addEventListener("submit", function (event) {
      window.ecoloopPrescreeningSubmit(event);
    });
  }

  function initializePrescreening() {
    if (!getRoot()) return;
    applyInitialApplicationFormState();
    attachEventListeners();
  }

  window.ecoloopPrescreeningOpen = function (event) {
    stopHandledEvent(event);
    resetResultView();
    openModal();
    return false;
  };

  window.ecoloopPrescreeningClose = function (event) {
    stopHandledEvent(event);
    hideApplicationForm();
    closeModal();
    return false;
  };

  window.ecoloopPrescreeningSubmit = function (event) {
    var form = getForm();
    stopHandledEvent(event);
    if (!form || !validateForm()) return false;
    var data = {
      prefecture: form.elements.prefecture.value,
      unpaidDelinquency: getRadioValue("unpaidDelinquency")
    };
    renderResult(evaluatePreScreening(data));
    return false;
  };

  window.ecoloopPrescreeningInitialize = initializePrescreening;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePrescreening);
  } else {
    initializePrescreening();
  }
})();
